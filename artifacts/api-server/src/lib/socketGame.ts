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
/**
 * Tracks the most-recently-seen socket ID for each player.
 * Used to distinguish a stale (old) socket's delayed disconnect event from a
 * real disconnection on the player's current socket.  When a player reconnects,
 * their new socket ID is written here; any subsequent disconnect event from an
 * older socket ID is ignored so it cannot trigger a spurious teardown.
 */
const playerToCurrentSocketId = new Map<string, string>();
/** Maps anonymous playerId → Game Center player ID (set on register/join events). */
const playerToGameCenterId = new Map<string, string>();
/** Stores the game center IDs for both participants of a finished game so stats can be updated. */
const gameParticipants = new Map<string, { playerId: string; gameCenterId?: string }[]>();
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
 * Record which game an authenticated player is currently in.
 * Best-effort — a failure here must not crash the game flow.
 */
async function setActiveGameInDb(gameCenterId: string, gameId: string): Promise<void> {
  try {
    await db
      .update(playersTable)
      .set({ activeGameId: gameId })
      .where(eq(playersTable.gameCenterId, gameCenterId));
  } catch (err) {
    logger.error({ err, gameCenterId, gameId }, 'Failed to set activeGameId in DB');
  }
}

/**
 * Clear the active-game record for an authenticated player (game ended/abandoned).
 * Best-effort.
 */
async function clearActiveGameInDb(gameCenterId: string): Promise<void> {
  try {
    await db
      .update(playersTable)
      .set({ activeGameId: null })
      .where(eq(playersTable.gameCenterId, gameCenterId));
  } catch (err) {
    logger.error({ err, gameCenterId }, 'Failed to clear activeGameId in DB');
  }
}

/**
 * Set activeGameId in DB for every authenticated participant of a new game.
 */
function setActiveGameForParticipants(gameId: string, participants: QueueEntry[]): void {
  for (const p of participants) {
    const gcId = p.gameCenterId ?? playerToGameCenterId.get(p.playerId);
    if (gcId && !isBotId(p.playerId)) void setActiveGameInDb(gcId, gameId);
  }
}

/**
 * Clear activeGameId in DB for every authenticated participant of an ended game.
 * Must be called before gameParticipants.delete(gameId).
 */
function clearActiveGameForParticipants(gameId: string): void {
  const participants = gameParticipants.get(gameId);
  if (!participants) return;
  for (const p of participants) {
    if (p.gameCenterId && !isBotId(p.playerId)) void clearActiveGameInDb(p.gameCenterId);
  }
}

/**
 * Award coins/stats in the DB for every authenticated participant after a game.
 * Players without a Game Center ID are silently skipped; the other player still
 * receives their update (e.g. authenticated user beats a bot or anonymous opponent).
 */
async function updatePlayerStats(gameId: string, winnerId: string): Promise<void> {
  // Clear active-game linkage first (before gameParticipants is deleted below).
  clearActiveGameForParticipants(gameId);

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

/**
 * Grace-period disconnect timers: maps playerId → setTimeout handle.
 * When a player disconnects mid-game we wait RECONNECT_GRACE_MS before
 * actually tearing the game down, giving them a chance to reconnect.
 */
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Per-player timeouts for the matchmaking queue.
 * If a real opponent doesn't appear within QUEUE_BOT_FALLBACK_MS, the waiting
 * player is automatically dropped into a bot game.
 */
const queueTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

/** How long (ms) to wait in the queue before falling back to a bot game. */
const QUEUE_BOT_FALLBACK_MS = 60_000;

/** Cancel and remove a pending queue-fallback timeout for a player. */
function clearQueueTimeout(playerId: string): void {
  const t = queueTimeouts.get(playerId);
  if (t !== undefined) {
    clearTimeout(t);
    queueTimeouts.delete(playerId);
  }
}

/** How long (ms) to keep a game alive after a player disconnects. */
const RECONNECT_GRACE_MS = 60_000;

/** Tell the OTHER player in a game that their opponent is temporarily away. */
function notifyOpponentReconnecting(io: Server, gameId: string, disconnectedPlayerId: string): void {
  const state = games.get(gameId);
  if (!state) return;
  const otherId = state.playerOrder.find((id) => id !== disconnectedPlayerId);
  if (!otherId || isBotId(otherId)) return;
  for (const [sid, p] of socketToPlayer.entries()) {
    if (p === otherId) {
      io.to(sid).emit('opponent_reconnecting');
      break;
    }
  }
}

/** Tell the OTHER player that the reconnecting player is back. */
function notifyOpponentReconnected(io: Server, gameId: string, reconnectedPlayerId: string): void {
  const state = games.get(gameId);
  if (!state) return;
  const otherId = state.playerOrder.find((id) => id !== reconnectedPlayerId);
  if (!otherId || isBotId(otherId)) return;
  for (const [sid, p] of socketToPlayer.entries()) {
    if (p === otherId) {
      io.to(sid).emit('opponent_reconnected');
      break;
    }
  }
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

function notifyAndTeardownGame(io: Server, gameId: string, exceptPlayerId?: string): void {
  const state = games.get(gameId);
  if (!state) return;
  // Clear DB active-game links before deleting gameParticipants.
  clearActiveGameForParticipants(gameId);
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
  for (const pid of state.playerOrder) {
    if (isBotId(pid)) continue;
    const view = getGameView(state, pid);
    for (const [sid, p] of socketToPlayer.entries()) {
      if (p === pid) {
        io.to(sid).emit(event, { ...view, ...extra });
        break;
      }
    }
  }
}

/**
 * Build the `drawPlayerId` / `drawEventId` extra fields for a `game_update`.
 * Returns non-null values only when the deck shrank (i.e. a card was drawn).
 * The `drawEventId` is a unique token per event so two consecutive draws by
 * the same player both trigger the animation on the client.
 */
function drawExtra(
  actorId: string,
  prevDeckLen: number,
  newDeckLen: number,
): { drawPlayerId: string | null; drawEventId: string | null } {
  if (newDeckLen < prevDeckLen) {
    return {
      drawPlayerId: actorId,
      drawEventId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
  }
  return { drawPlayerId: null, drawEventId: null };
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
            io.to(sid).emit('game_update', { ...view, drawPlayerId: null, drawEventId: null });
            break;
          }
        }
      }
      if (isBotId(confirmed.newState.currentPlayerId)) {
        scheduleBotTurn(io, gameId);
      }
    } else {
      emitGameView(io, confirmed.newState, 'game_update', { drawPlayerId: null, drawEventId: null });
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
        drawPlayerId: null,
        drawEventId: null,
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
        ...drawExtra(botId, state.deck.length, outcome.newState.deck.length),
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
        drawPlayerId: null,
        drawEventId: null,
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
    io.emit('online_count', io.engine.clientsCount);

    socket.on('join_queue', (data: { playerId: string; playerName: string; gameCenterId?: string }) => {
      const { playerId, playerName, gameCenterId } = data;
      socketToPlayer.set(socket.id, playerId);
      playerToCurrentSocketId.set(playerId, socket.id);
      if (gameCenterId) playerToGameCenterId.set(playerId, gameCenterId);

      // Cancel any lingering disconnect timer from a previous game session.
      const existingTimer = disconnectTimers.get(playerId);
      if (existingTimer !== undefined) { clearTimeout(existingTimer); disconnectTimers.delete(playerId); }

      // Cancel any pre-existing queue fallback timer (re-queuing scenario).
      clearQueueTimeout(playerId);

      const existing = queue.findIndex((e) => e.playerId === playerId);
      if (existing >= 0) queue.splice(existing, 1);

      queue.push({ socketId: socket.id, playerId, playerName, gameCenterId });
      socket.emit('queue_joined');
      logger.info({ playerId, queueLen: queue.length }, 'Joined queue');

      if (queue.length >= 2) {
        const p1 = queue.shift()!;
        const p2 = queue.shift()!;

        // Both players matched — cancel their individual fallback timers.
        clearQueueTimeout(p1.playerId);
        clearQueueTimeout(p2.playerId);

        const state = dealGame([p1.playerId, p2.playerId], [p1.playerName, p2.playerName]);

        games.set(state.gameId, state);
        playerToGame.set(p1.playerId, state.gameId);
        playerToGame.set(p2.playerId, state.gameId);
        registerParticipants(state.gameId, [p1, p2]);
        setActiveGameForParticipants(state.gameId, [p1, p2]);

        for (const p of [p1, p2]) {
          const view = getGameView(state, p.playerId);
          io.to(p.socketId).emit('game_start', view);
        }

        logger.info({ gameId: state.gameId }, 'Game started');
      } else {
        // Solo in queue — start the bot-fallback countdown.
        const fallbackTimer = setTimeout(() => {
          queueTimeouts.delete(playerId);

          // Check the player is still waiting (they may have cancelled or matched).
          const idx = queue.findIndex((e) => e.playerId === playerId);
          if (idx < 0) return;

          const entry = queue.splice(idx, 1)[0]!;

          const botId = newBotId();
          const botName = randomBotName();
          const state = dealGame([entry.playerId, botId], [entry.playerName, botName]);

          games.set(state.gameId, state);
          playerToGame.set(entry.playerId, state.gameId);
          playerToGame.set(botId, state.gameId);
          registerParticipants(state.gameId, [
            entry,
            { socketId: '', playerId: botId, playerName: botName },
          ]);
          setActiveGameForParticipants(state.gameId, [entry]);

          const view = getGameView(state, entry.playerId);
          io.to(entry.socketId).emit('game_start', view);

          logger.info({ gameId: state.gameId, botName, playerId: entry.playerId }, 'Bot fallback game started after queue timeout');

          scheduleBotSetup(io, state.gameId, botId);
        }, QUEUE_BOT_FALLBACK_MS);

        queueTimeouts.set(playerId, fallbackTimer);
      }
    });

    socket.on('start_bot_game', (data: { playerId: string; playerName: string; gameCenterId?: string }) => {
      const { playerId, playerName, gameCenterId } = data;
      socketToPlayer.set(socket.id, playerId);
      playerToCurrentSocketId.set(playerId, socket.id);
      if (gameCenterId) playerToGameCenterId.set(playerId, gameCenterId);

      // Cancel any lingering disconnect timer from a previous game session.
      const existingTimer = disconnectTimers.get(playerId);
      if (existingTimer !== undefined) { clearTimeout(existingTimer); disconnectTimers.delete(playerId); }

      // Cancel any queue fallback timer since the player is explicitly starting a bot game.
      clearQueueTimeout(playerId);

      removeFromQueue(playerId);

      const existingGameId = playerToGame.get(playerId);
      if (existingGameId) {
        notifyAndTeardownGame(io, existingGameId, playerId);
      }

      const botId = newBotId();
      const botName = randomBotName();

      const state = dealGame([playerId, botId], [playerName, botName]);

      const humanEntry = { socketId: socket.id, playerId, playerName, gameCenterId };
      games.set(state.gameId, state);
      playerToGame.set(playerId, state.gameId);
      playerToGame.set(botId, state.gameId);
      registerParticipants(state.gameId, [
        humanEntry,
        { socketId: '', playerId: botId, playerName: botName },
      ]);
      setActiveGameForParticipants(state.gameId, [humanEntry]);

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
        clearQueueTimeout(pid);
      }
      socket.emit('queue_cancelled');
    });

    socket.on('create_room', (data: { playerId: string; playerName: string; gameCenterId?: string }) => {
      const { playerId, playerName, gameCenterId } = data;
      socketToPlayer.set(socket.id, playerId);
      playerToCurrentSocketId.set(playerId, socket.id);
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
      playerToCurrentSocketId.set(playerId, socket.id);
      if (gameCenterId) playerToGameCenterId.set(playerId, gameCenterId);

      // Cancel any lingering disconnect timer from a previous game session.
      const existingTimer = disconnectTimers.get(playerId);
      if (existingTimer !== undefined) { clearTimeout(existingTimer); disconnectTimers.delete(playerId); }

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

      const joinerEntry = { socketId: socket.id, playerId, playerName, gameCenterId };
      games.set(state.gameId, state);
      playerToGame.set(room.creator.playerId, state.gameId);
      playerToGame.set(playerId, state.gameId);
      registerParticipants(state.gameId, [room.creator, joinerEntry]);
      setActiveGameForParticipants(state.gameId, [room.creator, joinerEntry]);

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
        ...drawExtra(pid, state.deck.length, outcome.newState.deck.length),
      });

      if (outcome.result.gameOver) {
        void updatePlayerStats(data.gameId, pid);
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
      emitGameView(io, outcome.newState, 'game_update', { drawPlayerId: null, drawEventId: null });
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
      emitGameView(io, outcome.newState, 'game_update', { drawPlayerId: null, drawEventId: null });
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
              io.to(sid).emit('game_update', { ...view, drawPlayerId: null, drawEventId: null });
              break;
            }
          }
        }
        if (isBotId(outcome.newState.currentPlayerId)) {
          scheduleBotTurn(io, data.gameId);
        }
      } else {
        emitGameView(io, outcome.newState, 'game_update', { drawPlayerId: null, drawEventId: null });
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
        drawPlayerId: null,
        drawEventId: null,
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

    socket.on('register', async (data: { playerId: string; gameCenterId?: string }) => {
      if (!data?.playerId) return;
      const pid = data.playerId;
      const inboundGcId = data.gameCenterId;

      // ── Security: verify identity ──────────────────────────────────────────
      // If we already have a gameCenterId stored for this playerId (the player
      // was previously authenticated in this server session), the reconnecting
      // client MUST present the exact same gameCenterId.  Omitting it entirely
      // or providing a different one is treated as an identity mismatch — we
      // register the socket so the client can start a fresh session, but we
      // NEVER restore game state that belongs to the stored authenticated identity.
      const storedGcId = playerToGameCenterId.get(pid);
      if (storedGcId && inboundGcId !== storedGcId) {
        logger.warn({ pid, storedGcId, hasInbound: !!inboundGcId }, 'gameCenterId mismatch on register — rejecting reconnect');
        socketToPlayer.set(socket.id, pid);
        return;
      }

      // ── Update mappings ────────────────────────────────────────────────────
      // Remove any stale socketToPlayer entries that belong to this player
      // from prior connections. emitGameView and similar functions iterate
      // socketToPlayer and break on first match; stale entries cause them to
      // target the wrong (disconnected) socket instead of the live one.
      for (const [oldSid, mappedPid] of socketToPlayer.entries()) {
        if (mappedPid === pid && oldSid !== socket.id) {
          socketToPlayer.delete(oldSid);
        }
      }
      socketToPlayer.set(socket.id, pid);
      playerToCurrentSocketId.set(pid, socket.id);
      if (inboundGcId) playerToGameCenterId.set(pid, inboundGcId);

      // Determine the effective gameCenterId (inbound wins over stored).
      const effectiveGcId = inboundGcId ?? storedGcId;

      // ── Cancel any pending grace-period timer ──────────────────────────────
      const hadTimer = disconnectTimers.has(pid);
      const timer = disconnectTimers.get(pid);
      if (timer !== undefined) {
        clearTimeout(timer);
        disconnectTimers.delete(pid);
      }

      // ── Resolve active gameId from in-memory map (primary source) ──────────
      let gameId = playerToGame.get(pid);

      // ── DB fallback: for authenticated players whose in-memory state is gone
      // (e.g. server recovered from a partial restart or state was never set) ──
      if (!gameId && effectiveGcId) {
        try {
          const [row] = await db
            .select({ activeGameId: playersTable.activeGameId })
            .from(playersTable)
            .where(eq(playersTable.gameCenterId, effectiveGcId))
            .limit(1);
          if (row?.activeGameId && games.has(row.activeGameId)) {
            // Game is still alive in memory — re-establish the mapping.
            const resolvedGameId = row.activeGameId;
            gameId = resolvedGameId;
            playerToGame.set(pid, resolvedGameId);
            logger.info({ pid, gameId }, 'Restored playerToGame from DB activeGameId');
          }
        } catch (err) {
          logger.error({ err, pid }, 'DB lookup for activeGameId failed during register');
        }
      }

      // ── Restore game state if there is an active game ─────────────────────
      if (gameId) {
        const state = games.get(gameId);
        if (state && state.playerOrder.includes(pid)) {
          logger.info(
            { pid, gameId, hadTimer },
            hadTimer
              ? 'Player reconnected within grace period — restoring game'
              : 'Player re-registered with active game — restoring',
          );
          const view = getGameView(state, pid);
          socket.emit('game_restored', view);
          // Only tell the opponent the player is back if we previously told them
          // the player was away (i.e. a grace-period reconnect).
          if (hadTimer) {
            notifyOpponentReconnected(io, gameId, pid);
          }
        }
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
      io.emit('online_count', io.engine.clientsCount);
      const pid = socketToPlayer.get(socket.id);
      logger.info({ sid: socket.id, pid }, 'Socket disconnected');

      // Always clean up the reverse mapping for this specific socket.
      socketToPlayer.delete(socket.id);

      if (pid) {
        // ── Stale-socket guard ──────────────────────────────────────────────
        // On mobile, the old socket's disconnect event can arrive late (after
        // the ping timeout) even if the player has already reconnected on a new
        // socket. If this disconnecting socket is NOT the player's current one,
        // ignore all game logic — the player is still live on their new socket.
        const currentSid = playerToCurrentSocketId.get(pid);
        if (currentSid && currentSid !== socket.id) {
          logger.info({ sid: socket.id, currentSid, pid }, 'Stale socket disconnected — ignoring game logic');
          return;
        }

        const gameId = playerToGame.get(pid);
        if (gameId) {
          const state = games.get(gameId);
          if (state) {
            const otherId = state.playerOrder.find((id) => id !== pid);
            const opponentIsBot = otherId ? isBotId(otherId) : true;

            if (opponentIsBot) {
              // Bot games: tear down immediately — no point holding state for a bot.
              // Clear DB active-game linkage before deleting gameParticipants.
              clearActiveGameForParticipants(gameId);
              games.delete(gameId);
              gameParticipants.delete(gameId);
              playerToGame.delete(pid);
              if (otherId) playerToGame.delete(otherId);
            } else {
              // Human vs human: start the grace period.
              // Notify the opponent that their adversary is temporarily away.
              notifyOpponentReconnecting(io, gameId, pid);

              const timer = setTimeout(() => {
                disconnectTimers.delete(pid);
                // Only tear down if the player still hasn't rejoined this game.
                if (playerToGame.get(pid) === gameId) {
                  logger.info({ pid, gameId }, 'Grace period expired — tearing down game');
                  notifyAndTeardownGame(io, gameId, pid);
                  playerToGame.delete(pid);
                }
              }, RECONNECT_GRACE_MS);
              disconnectTimers.set(pid, timer);
            }
          }
        }
        const qi = queue.findIndex((e) => e.playerId === pid);
        if (qi >= 0) {
          queue.splice(qi, 1);
          clearQueueTimeout(pid);
        }
        // NOTE: Intentionally do NOT delete hosted private rooms here.
        // Mobile clients routinely lose the WebSocket while the user switches
        // apps to share the room code. The room is GC'd by reapStaleRooms()
        // once it exceeds ROOM_TTL_MS.
      }
    });
  });

  setInterval(reapStaleRooms, 60 * 1000).unref();

  logger.info('Socket.io game server initialized');
}
