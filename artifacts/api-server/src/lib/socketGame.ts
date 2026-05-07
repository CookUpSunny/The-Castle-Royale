import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import {
  confirmSetup,
  dealGame,
  getGameView,
  pickupPile,
  playCards,
  setFaceUp,
  swapCards,
  type GameState,
} from './gameEngine.js';
import { isBotId, newBotId, pickBotMove, pickBotSetupSwaps, randomBotName } from './botPlayer.js';
import { logger } from './logger.js';
import { db } from '@workspace/db';
import { playersTable } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';
import { submitLeaderboardScore } from './gamecenter.js';

interface QueueEntry {
  socketId: string;
  playerId: string;
  playerName: string;
  gameCenterId?: string;
}

interface PrivateRoom {
  code: string;
  creator: QueueEntry;
  createdAt: number;
}

const queue: QueueEntry[] = [];
const games = new Map<string, GameState>();
const playerToGame = new Map<string, string>();
const socketToPlayer = new Map<string, string>();
/** Maps anonymous playerId → Game Center player ID (set on register/join events). */
const playerToGameCenterId = new Map<string, string>();
/** Stores the game center IDs for both participants of a finished game so stats can be updated. */
const gameParticipants = new Map<string, { playerId: string; gameCenterId?: string }[]>();
/** Maps gameId → Set of spectator socket IDs watching that game. */
const gameSpectators = new Map<string, Set<string>>();
/** Maps spectator socketId → gameId they are watching. */
const spectatorToGame = new Map<string, string>();

// Allow-list of emotes the client can send.
const ALLOWED_EMOTES = new Set<string>([
  '👋', '🔥', '😎', '🎉', '🤝', '👑', '⚡', '💀',
  'GG!', 'NICE!', 'LUCKY!', 'OOF!',
]);
const EMOTE_COOLDOWN_MS = 1500;
const lastEmoteAt = new Map<string, number>();

/**
 * Standard ELO update (K=32).
 * Returns [newWinnerElo, newLoserElo].
 */
function calcElo(winnerElo: number, loserElo: number): [number, number] {
  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 - expectedWinner;
  const newWinner = Math.round(winnerElo + K * (1 - expectedWinner));
  const newLoser = Math.round(loserElo + K * (0 - expectedLoser));
  return [newWinner, newLoser];
}

/** Assumed ELO for an anonymous/bot opponent when their profile isn't in the DB. */
const ANONYMOUS_ELO = 1000;

/**
 * Award coins/stats in the DB for every authenticated participant after a game.
 * Players without a Game Center ID are silently skipped; the other player still
 * receives their update (e.g. authenticated user beats a bot or anonymous opponent).
 */
async function updatePlayerStats(gameId: string, winnerId: string): Promise<void> {
  const participants = gameParticipants.get(gameId);
  gameParticipants.delete(gameId);
  if (!participants || participants.length < 2) return;

  const winner = participants.find((p) => p.playerId === winnerId);
  const loser = participants.find((p) => p.playerId !== winnerId);

  // Neither player authenticated — nothing to do.
  if (!winner?.gameCenterId && !loser?.gameCenterId) return;

  try {
    // Fetch rows for authenticated players only.
    const [winnerRow] = winner?.gameCenterId
      ? await db
          .select()
          .from(playersTable)
          .where(eq(playersTable.gameCenterId, winner.gameCenterId))
          .limit(1)
      : [undefined];

    const [loserRow] = loser?.gameCenterId
      ? await db
          .select()
          .from(playersTable)
          .where(eq(playersTable.gameCenterId, loser.gameCenterId))
          .limit(1)
      : [undefined];

    // Use the other player's actual ELO when available; fall back to ANONYMOUS_ELO.
    const winnerElo = winnerRow?.elo ?? ANONYMOUS_ELO;
    const loserElo = loserRow?.elo ?? ANONYMOUS_ELO;
    const [newWinnerElo, newLoserElo] = calcElo(winnerElo, loserElo);

    if (winnerRow && winner?.gameCenterId) {
      await db
        .update(playersTable)
        .set({
          coins: winnerRow.coins + 50,
          wins: winnerRow.wins + 1,
          winStreak: winnerRow.winStreak + 1,
          elo: newWinnerElo,
        })
        .where(eq(playersTable.gameCenterId, winner.gameCenterId));

      // Submit the winner's new ELO to the Game Center leaderboard.
      void submitLeaderboardScore(winner.gameCenterId, newWinnerElo);
    }

    if (loserRow && loser?.gameCenterId) {
      await db
        .update(playersTable)
        .set({
          coins: Math.max(0, loserRow.coins - 20),
          losses: loserRow.losses + 1,
          winStreak: 0,
          elo: newLoserElo,
        })
        .where(eq(playersTable.gameCenterId, loser.gameCenterId));
    }

    logger.info(
      {
        gameId,
        winnerGcId: winner?.gameCenterId,
        loserGcId: loser?.gameCenterId,
        newWinnerElo,
        newLoserElo,
      },
      'Player stats updated after game',
    );
  } catch (err) {
    logger.error({ err, gameId }, 'Failed to update player stats');
  }
}

/**
 * Bot replies to a human emote with a friendly counter-emote after a beat.
 */
function scheduleBotEmote(io: Server, gameId: string, botId: string): void {
  const replies = ['👋', '🔥', '😎', '🎉', 'GG!', 'NICE!'];
  const reply = replies[Math.floor(Math.random() * replies.length)] ?? '👋';
  const delay = 800 + Math.floor(Math.random() * 900);
  setTimeout(() => {
    const state = games.get(gameId);
    if (!state || !state.playerOrder.includes(botId)) return;
    const payload = { playerId: botId, emote: reply, ts: Date.now() };
    for (const orderedPid of state.playerOrder) {
      if (isBotId(orderedPid)) continue;
      for (const [sid, p] of socketToPlayer.entries()) {
        if (p === orderedPid) {
          io.to(sid).emit('emote_received', payload);
          break;
        }
      }
    }
  }, delay);
}

/** Open invite-only rooms keyed by their 6-character code. */
const rooms = new Map<string, PrivateRoom>();
/** Index from playerId to the room they're hosting. */
const playerToRoom = new Map<string, string>();

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_MS = 15 * 60 * 1000;

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('Could not allocate a unique room code');
}

function reapStaleRooms(): void {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > ROOM_TTL_MS) {
      rooms.delete(code);
      playerToRoom.delete(room.creator.playerId);
    }
  }
}

const BOT_THINK_MIN_MS = 800;
const BOT_THINK_MAX_MS = 1600;

function botThinkTime(): number {
  return BOT_THINK_MIN_MS + Math.floor(Math.random() * (BOT_THINK_MAX_MS - BOT_THINK_MIN_MS));
}

/** Build a spectator-safe view of the game — no hand card values exposed. */
function getSpectatorView(state: GameState, extra?: Record<string, unknown>): Record<string, unknown> {
  const [p1id, p2id] = state.playerOrder;
  const p1 = state.players[p1id!]!;
  const p2 = state.players[p2id!]!;
  const spectatorCount = gameSpectators.get(state.gameId)?.size ?? 0;
  return {
    gameId: state.gameId,
    player1Name: p1.name,
    player1HandCount: p1.hand.length,
    player1FaceUp: state.phase === 'setup' ? [] : p1.faceUp,
    player1FaceDownCount: p1.faceDown.length,
    player2Name: p2.name,
    player2HandCount: p2.hand.length,
    player2FaceUp: state.phase === 'setup' ? [] : p2.faceUp,
    player2FaceDownCount: p2.faceDown.length,
    discardPile: state.discardPile,
    deckCount: state.deck.length,
    currentPlayerName: state.players[state.currentPlayerId]?.name ?? '',
    phase: state.phase,
    spectatorCount,
    ...extra,
  };
}

/** Notify spectators the game ended, remove them from tracking maps. */
function cleanupGameSpectators(io: Server, gameId: string): void {
  const spectators = gameSpectators.get(gameId);
  if (!spectators) return;
  for (const sid of spectators) {
    io.to(sid).emit('spectator_game_over');
    spectatorToGame.delete(sid);
  }
  gameSpectators.delete(gameId);
}

function notifyAndTeardownGame(io: Server, gameId: string, exceptPlayerId?: string): void {
  const state = games.get(gameId);
  if (!state) return;
  for (const id of state.playerOrder) {
    if (id === exceptPlayerId) continue;
    if (isBotId(id)) continue;
    for (const [sid, p] of socketToPlayer.entries()) {
      if (p === id) {
        io.to(sid).emit('opponent_disconnected');
        break;
      }
    }
  }
  for (const id of state.playerOrder) playerToGame.delete(id);
  games.delete(gameId);
  gameParticipants.delete(gameId);
  cleanupGameSpectators(io, gameId);
}

function removeFromQueue(playerId: string): void {
  const idx = queue.findIndex((e) => e.playerId === playerId);
  if (idx >= 0) queue.splice(idx, 1);
}

function emitGameView(
  io: Server,
  state: GameState,
  event: string,
  extra?: Record<string, unknown>,
): void {
  const spectatorCount = gameSpectators.get(state.gameId)?.size ?? 0;
  for (const pid of state.playerOrder) {
    if (isBotId(pid)) continue;
    const view = getGameView(state, pid);
    for (const [sid, p] of socketToPlayer.entries()) {
      if (p === pid) {
        io.to(sid).emit(event, { ...view, spectatorCount, ...extra });
        break;
      }
    }
  }
  // Push spectator-safe view to all spectators watching this game.
  const spectators = gameSpectators.get(state.gameId);
  if (spectators && spectators.size > 0) {
    const sv = getSpectatorView(state, extra);
    for (const sid of spectators) {
      io.to(sid).emit('spectator_update', sv);
    }
  }
}

/**
 * Register game participants so we can update their stats when the game ends.
 */
function registerParticipants(gameId: string, players: QueueEntry[]): void {
  gameParticipants.set(
    gameId,
    players.map((p) => ({
      playerId: p.playerId,
      gameCenterId: p.gameCenterId ?? playerToGameCenterId.get(p.playerId),
    })),
  );
}

function scheduleBotSetup(io: Server, gameId: string, botId: string): void {
  setTimeout(() => {
    let state = games.get(gameId);
    if (!state || state.phase !== 'setup') return;

    const swaps = pickBotSetupSwaps(state, botId);
    for (const { handCardId, faceUpCardId } of swaps) {
      const out = swapCards(state, botId, handCardId, faceUpCardId);
      if ('error' in out) continue;
      state = out.newState;
      games.set(gameId, state);
    }

    const confirmed = confirmSetup(state, botId);
    if ('error' in confirmed) return;
    games.set(gameId, confirmed.newState);

    if (confirmed.started) {
      for (const orderedPid of confirmed.newState.playerOrder) {
        if (isBotId(orderedPid)) continue;
        const view = getGameView(confirmed.newState, orderedPid);
        for (const [sid, p] of socketToPlayer.entries()) {
          if (p === orderedPid) {
            io.to(sid).emit('game_update', view);
            break;
          }
        }
      }
      if (isBotId(confirmed.newState.currentPlayerId)) {
        scheduleBotTurn(io, gameId);
      }
    } else {
      emitGameView(io, confirmed.newState, 'game_update');
    }
  }, 1500);
}

function scheduleBotTurn(io: Server, gameId: string): void {
  setTimeout(() => {
    const state = games.get(gameId);
    if (!state || state.phase !== 'playing') return;

    const botId = state.playerOrder.find((id) => isBotId(id));
    if (!botId || state.currentPlayerId !== botId) return;

    const move = pickBotMove(state, botId);

    let outcome: ReturnType<typeof playCards> | ReturnType<typeof pickupPile>;
    if (move.action === 'pickup' || !move.cardIds || move.cardIds.length === 0) {
      outcome = pickupPile(state, botId);
    } else {
      outcome = playCards(state, botId, move.cardIds);
    }

    if ('error' in outcome) {
      logger.warn({ gameId, error: outcome.error }, 'Bot move failed, picking up');
      const fallback = pickupPile(state, botId);
      if ('error' in fallback) return;
      games.set(gameId, fallback.newState);
      emitGameView(io, fallback.newState, 'game_update', {
        lastEvent: { type: 'pickup', playerId: botId },
      });
      if (fallback.newState.currentPlayerId === botId && fallback.newState.phase === 'playing') {
        scheduleBotTurn(io, gameId);
      }
      return;
    }

    games.set(gameId, outcome.newState);

    if ('result' in outcome) {
      emitGameView(io, outcome.newState, 'game_update', {
        lastEvent: {
          type: outcome.result.effect,
          playerId: botId,
          card: outcome.result.playedCard,
          playedCount: outcome.result.playedCount,
          burned: outcome.result.burned,
          extraTurn: outcome.result.extraTurn,
          wasFaceDown: outcome.result.wasFaceDown,
          previousTop: outcome.result.previousTop,
        },
      });

      if (outcome.result.gameOver) {
        // Bot won — winner is the bot (no DB update needed for bot winner)
        void updatePlayerStats(gameId, botId);
        games.delete(gameId);
        for (const id of outcome.newState.playerOrder) playerToGame.delete(id);
        logger.info({ gameId, winner: botId }, 'Bot won game');
        return;
      }
    } else {
      emitGameView(io, outcome.newState, 'game_update', {
        lastEvent: { type: 'pickup', playerId: botId },
      });
    }

    if (outcome.newState.currentPlayerId === botId && outcome.newState.phase === 'playing') {
      scheduleBotTurn(io, gameId);
    }
  }, botThinkTime());
}

export function initSocketGame(httpServer: HttpServer): void {
  const io = new Server(httpServer, {
    path: '/api/socket.io',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ sid: socket.id }, 'Socket connected');

    socket.on('join_queue', (data: { playerId: string; playerName: string; gameCenterId?: string }) => {
      const { playerId, playerName, gameCenterId } = data;
      socketToPlayer.set(socket.id, playerId);
      if (gameCenterId) playerToGameCenterId.set(playerId, gameCenterId);

      const existing = queue.findIndex((e) => e.playerId === playerId);
      if (existing >= 0) queue.splice(existing, 1);

      queue.push({ socketId: socket.id, playerId, playerName, gameCenterId });
      socket.emit('queue_joined');
      logger.info({ playerId, queueLen: queue.length }, 'Joined queue');

      if (queue.length >= 2) {
        const p1 = queue.shift()!;
        const p2 = queue.shift()!;
        const state = dealGame([p1.playerId, p2.playerId], [p1.playerName, p2.playerName]);

        games.set(state.gameId, state);
        playerToGame.set(p1.playerId, state.gameId);
        playerToGame.set(p2.playerId, state.gameId);
        registerParticipants(state.gameId, [p1, p2]);

        for (const p of [p1, p2]) {
          const view = getGameView(state, p.playerId);
          io.to(p.socketId).emit('game_start', view);
        }

        logger.info({ gameId: state.gameId }, 'Game started');
      }
    });

    socket.on('start_bot_game', (data: { playerId: string; playerName: string; gameCenterId?: string }) => {
      const { playerId, playerName, gameCenterId } = data;
      socketToPlayer.set(socket.id, playerId);
      if (gameCenterId) playerToGameCenterId.set(playerId, gameCenterId);

      removeFromQueue(playerId);

      const existingGameId = playerToGame.get(playerId);
      if (existingGameId) {
        notifyAndTeardownGame(io, existingGameId, playerId);
      }

      const botId = newBotId();
      const botName = randomBotName();

      const state = dealGame([playerId, botId], [playerName, botName]);

      games.set(state.gameId, state);
      playerToGame.set(playerId, state.gameId);
      playerToGame.set(botId, state.gameId);
      registerParticipants(state.gameId, [
        { socketId: socket.id, playerId, playerName, gameCenterId },
        { socketId: '', playerId: botId, playerName: botName },
      ]);

      const view = getGameView(state, playerId);
      socket.emit('game_start', view);

      logger.info({ gameId: state.gameId, botName }, 'Bot game started');

      scheduleBotSetup(io, state.gameId, botId);
    });

    socket.on('cancel_queue', () => {
      const pid = socketToPlayer.get(socket.id);
      if (pid) {
        const idx = queue.findIndex((e) => e.playerId === pid);
        if (idx >= 0) queue.splice(idx, 1);
      }
      socket.emit('queue_cancelled');
    });

    socket.on('create_room', (data: { playerId: string; playerName: string; gameCenterId?: string }) => {
      const { playerId, playerName, gameCenterId } = data;
      socketToPlayer.set(socket.id, playerId);
      if (gameCenterId) playerToGameCenterId.set(playerId, gameCenterId);

      reapStaleRooms();

      const oldCode = playerToRoom.get(playerId);
      if (oldCode) rooms.delete(oldCode);

      removeFromQueue(playerId);

      const code = generateRoomCode();
      const room: PrivateRoom = {
        code,
        creator: { socketId: socket.id, playerId, playerName, gameCenterId },
        createdAt: Date.now(),
      };
      rooms.set(code, room);
      playerToRoom.set(playerId, code);

      socket.emit('room_created', { code });
      logger.info({ playerId, code }, 'Private room created');
    });

    socket.on('join_room', (data: { playerId: string; playerName: string; code: string; gameCenterId?: string }) => {
      const { playerId, playerName, gameCenterId } = data;
      const code = (data.code ?? '').toUpperCase().trim();
      socketToPlayer.set(socket.id, playerId);
      if (gameCenterId) playerToGameCenterId.set(playerId, gameCenterId);

      reapStaleRooms();

      const room = rooms.get(code);
      if (!room) {
        socket.emit('room_error', { message: 'Room not found. Double-check the code.' });
        return;
      }
      if (room.creator.playerId === playerId) {
        socket.emit('room_error', { message: "That's your own room — share the code with a friend." });
        return;
      }

      rooms.delete(code);
      playerToRoom.delete(room.creator.playerId);

      const hostOldGame = playerToGame.get(room.creator.playerId);
      if (hostOldGame) notifyAndTeardownGame(io, hostOldGame, room.creator.playerId);
      const joinerOldGame = playerToGame.get(playerId);
      if (joinerOldGame) notifyAndTeardownGame(io, joinerOldGame, playerId);

      removeFromQueue(room.creator.playerId);
      removeFromQueue(playerId);

      const state = dealGame(
        [room.creator.playerId, playerId],
        [room.creator.playerName, playerName],
      );

      games.set(state.gameId, state);
      playerToGame.set(room.creator.playerId, state.gameId);
      playerToGame.set(playerId, state.gameId);
      registerParticipants(state.gameId, [
        room.creator,
        { socketId: socket.id, playerId, playerName, gameCenterId },
      ]);

      let hostSocketId: string | null = null;
      for (const [sid, p] of socketToPlayer.entries()) {
        if (p === room.creator.playerId) { hostSocketId = sid; break; }
      }
      if (!hostSocketId) {
        games.delete(state.gameId);
        playerToGame.delete(room.creator.playerId);
        playerToGame.delete(playerId);
        gameParticipants.delete(state.gameId);
        socket.emit('room_error', { message: 'The host has left. Ask for a new code.' });
        return;
      }

      io.to(hostSocketId).emit('game_start', getGameView(state, room.creator.playerId));
      socket.emit('game_start', getGameView(state, playerId));

      logger.info({ gameId: state.gameId, code }, 'Private room match started');
    });

    socket.on('cancel_room', () => {
      const pid = socketToPlayer.get(socket.id);
      if (!pid) return;
      const code = playerToRoom.get(pid);
      if (code) {
        rooms.delete(code);
        playerToRoom.delete(pid);
      }
      socket.emit('room_cancelled');
    });

    socket.on('play_card', (data: { gameId: string; cardId?: string; cardIds?: string[] }) => {
      const pid = socketToPlayer.get(socket.id);
      if (!pid) return;
      const state = games.get(data.gameId);
      if (!state) return;

      const ids = data.cardIds ?? (data.cardId ? [data.cardId] : []);
      if (ids.length === 0) {
        socket.emit('play_error', { message: 'No cards specified' });
        return;
      }

      const outcome = playCards(state, pid, ids);
      if ('error' in outcome) {
        socket.emit('play_error', { message: outcome.error });
        return;
      }

      games.set(data.gameId, outcome.newState);
      emitGameView(io, outcome.newState, 'game_update', {
        lastEvent: {
          type: outcome.result.effect,
          playerId: pid,
          card: outcome.result.playedCard,
          playedCount: outcome.result.playedCount,
          burned: outcome.result.burned,
          extraTurn: outcome.result.extraTurn,
          wasFaceDown: outcome.result.wasFaceDown,
          previousTop: outcome.result.previousTop,
        },
      });

      if (outcome.result.gameOver) {
        void updatePlayerStats(data.gameId, pid);
        cleanupGameSpectators(io, data.gameId);
        games.delete(data.gameId);
        for (const id of outcome.newState.playerOrder) playerToGame.delete(id);
        logger.info({ gameId: data.gameId, winner: pid }, 'Game over');
        return;
      }

      if (isBotId(outcome.newState.currentPlayerId)) {
        scheduleBotTurn(io, data.gameId);
      }
    });

    socket.on('set_face_up', (data: { gameId: string; faceUpIds: string[] }) => {
      const pid = socketToPlayer.get(socket.id);
      if (!pid) return;
      const state = games.get(data.gameId);
      if (!state) return;

      const outcome = setFaceUp(state, pid, data.faceUpIds);
      if ('error' in outcome) {
        socket.emit('play_error', { message: outcome.error });
        return;
      }
      games.set(data.gameId, outcome.newState);
      emitGameView(io, outcome.newState, 'game_update');
    });

    socket.on('swap_card', (data: { gameId: string; handCardId: string; faceUpCardId: string }) => {
      const pid = socketToPlayer.get(socket.id);
      if (!pid) return;
      const state = games.get(data.gameId);
      if (!state) return;

      const outcome = swapCards(state, pid, data.handCardId, data.faceUpCardId);
      if ('error' in outcome) {
        socket.emit('play_error', { message: outcome.error });
        return;
      }
      games.set(data.gameId, outcome.newState);
      emitGameView(io, outcome.newState, 'game_update');
    });

    socket.on('confirm_setup', (data: { gameId: string }) => {
      const pid = socketToPlayer.get(socket.id);
      if (!pid) return;
      const state = games.get(data.gameId);
      if (!state) return;

      const outcome = confirmSetup(state, pid);
      if ('error' in outcome) {
        socket.emit('play_error', { message: outcome.error });
        return;
      }
      games.set(data.gameId, outcome.newState);

      if (outcome.started) {
        for (const orderedPid of outcome.newState.playerOrder) {
          if (isBotId(orderedPid)) continue;
          const view = getGameView(outcome.newState, orderedPid);
          for (const [sid, p] of socketToPlayer.entries()) {
            if (p === orderedPid) {
              io.to(sid).emit('game_update', view);
              break;
            }
          }
        }
        if (isBotId(outcome.newState.currentPlayerId)) {
          scheduleBotTurn(io, data.gameId);
        }
      } else {
        emitGameView(io, outcome.newState, 'game_update');
      }
    });

    socket.on('pickup_pile', (data: { gameId: string }) => {
      const pid = socketToPlayer.get(socket.id);
      if (!pid) return;
      const state = games.get(data.gameId);
      if (!state) return;

      const outcome = pickupPile(state, pid);
      if ('error' in outcome) {
        socket.emit('play_error', { message: outcome.error });
        return;
      }

      games.set(data.gameId, outcome.newState);
      emitGameView(io, outcome.newState, 'game_update', {
        lastEvent: { type: 'pickup', playerId: pid },
      });

      if (isBotId(outcome.newState.currentPlayerId)) {
        scheduleBotTurn(io, data.gameId);
      }
    });

    socket.on('send_emote', (data: { gameId: string; emote: string }) => {
      const pid = socketToPlayer.get(socket.id);
      if (!pid) return;
      const state = games.get(data.gameId);
      if (!state || !state.playerOrder.includes(pid)) return;

      const emote = String(data.emote ?? '').slice(0, 24);
      if (!ALLOWED_EMOTES.has(emote)) return;

      const now = Date.now();
      const last = lastEmoteAt.get(pid) ?? 0;
      if (now - last < EMOTE_COOLDOWN_MS) return;
      lastEmoteAt.set(pid, now);

      const payload = { playerId: pid, emote, ts: now };
      for (const orderedPid of state.playerOrder) {
        if (isBotId(orderedPid)) continue;
        for (const [sid, p] of socketToPlayer.entries()) {
          if (p === orderedPid) {
            io.to(sid).emit('emote_received', payload);
            break;
          }
        }
      }

      const opponentId = state.playerOrder.find((id) => id !== pid);
      if (opponentId && isBotId(opponentId)) {
        scheduleBotEmote(io, data.gameId, opponentId);
      }
    });

    socket.on('register', (data: { playerId: string; gameCenterId?: string }) => {
      if (!data?.playerId) return;
      socketToPlayer.set(socket.id, data.playerId);
      if (data.gameCenterId) playerToGameCenterId.set(data.playerId, data.gameCenterId);
    });

    socket.on('get_active_games', () => {
      const active: Array<{
        gameId: string;
        player1Name: string;
        player2Name: string;
        turnCount: number;
        spectatorCount: number;
      }> = [];
      for (const [gameId, state] of games.entries()) {
        if (state.phase !== 'playing') continue;
        const [p1id, p2id] = state.playerOrder;
        if (!p1id || !p2id || isBotId(p1id) || isBotId(p2id)) continue;
        const p1 = state.players[p1id]!;
        const p2 = state.players[p2id]!;
        active.push({
          gameId,
          player1Name: p1.name,
          player2Name: p2.name,
          turnCount: state.discardPile.length,
          spectatorCount: gameSpectators.get(gameId)?.size ?? 0,
        });
      }
      socket.emit('active_games', active);
    });

    socket.on('spectate_game', (data: { gameId: string }) => {
      const gameId = String(data?.gameId ?? '');
      const state = games.get(gameId);
      if (!state || state.phase !== 'playing') {
        socket.emit('spectate_error', { message: 'Game not found or not in progress.' });
        return;
      }
      const prevGameId = spectatorToGame.get(socket.id);
      if (prevGameId && prevGameId !== gameId) {
        gameSpectators.get(prevGameId)?.delete(socket.id);
        spectatorToGame.delete(socket.id);
      }
      if (!gameSpectators.has(gameId)) gameSpectators.set(gameId, new Set());
      gameSpectators.get(gameId)!.add(socket.id);
      spectatorToGame.set(socket.id, gameId);
      socket.emit('spectator_update', getSpectatorView(state));
      // Push updated spectatorCount to active players so their badge refreshes immediately.
      emitGameView(io, state, 'game_update');
      logger.info({ sid: socket.id, gameId }, 'Spectator joined');
    });

    socket.on('leave_spectate', () => {
      const gameId = spectatorToGame.get(socket.id);
      if (gameId) {
        gameSpectators.get(gameId)?.delete(socket.id);
        spectatorToGame.delete(socket.id);
        // Push updated spectatorCount to active players so their badge refreshes immediately.
        const state = games.get(gameId);
        if (state) emitGameView(io, state, 'game_update');
      }
    });

    socket.on('leave_game', (data: { gameId: string }) => {
      const pid = socketToPlayer.get(socket.id);
      if (!pid) return;
      const state = games.get(data.gameId);
      if (!state || !state.playerOrder.includes(pid)) return;
      logger.info({ sid: socket.id, pid, gameId: data.gameId }, 'Player left game');
      notifyAndTeardownGame(io, data.gameId, pid);
      playerToGame.delete(pid);
      socket.emit('left_game');
    });

    socket.on('disconnect', () => {
      const pid = socketToPlayer.get(socket.id);
      logger.info({ sid: socket.id, pid }, 'Socket disconnected');

      if (pid) {
        const gameId = playerToGame.get(pid);
        if (gameId) {
          const state = games.get(gameId);
          if (state) {
            const otherId = state.playerOrder.find((id) => id !== pid);
            if (otherId && !isBotId(otherId)) {
              for (const [sid, p] of socketToPlayer.entries()) {
                if (p === otherId) {
                  io.to(sid).emit('opponent_disconnected');
                  break;
                }
              }
            }
            cleanupGameSpectators(io, gameId);
            games.delete(gameId);
            gameParticipants.delete(gameId);
            playerToGame.delete(pid);
            if (otherId) playerToGame.delete(otherId);
          }
        }
        const qi = queue.findIndex((e) => e.playerId === pid);
        if (qi >= 0) queue.splice(qi, 1);
        // NOTE: Intentionally do NOT delete hosted private rooms here.
        // Mobile clients routinely lose the WebSocket while the user switches
        // apps to share the room code. The room is GC'd by reapStaleRooms()
        // once it exceeds ROOM_TTL_MS.
        // Cleanup spectator state if this socket was watching a game.
        const spectatedGameId = spectatorToGame.get(socket.id);
        if (spectatedGameId) {
          gameSpectators.get(spectatedGameId)?.delete(socket.id);
          spectatorToGame.delete(socket.id);
        }
        socketToPlayer.delete(socket.id);
      }
    });
  });

  setInterval(reapStaleRooms, 60 * 1000).unref();

  logger.info('Socket.io game server initialized');
}
