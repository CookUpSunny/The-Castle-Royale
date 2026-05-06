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

interface QueueEntry {
  socketId: string;
  playerId: string;
  playerName: string;
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

// Allow-list of emotes the client can send. Keeps the channel bounded so we
// don't accidentally end up with a free-form chat (which would need
// moderation). Mix of emoji-only and short taunt phrases.
const ALLOWED_EMOTES = new Set<string>([
  '👋', '🔥', '😎', '🎉', '🤝', '👑', '⚡', '💀',
  'GG!', 'NICE!', 'LUCKY!', 'OOF!',
]);
const EMOTE_COOLDOWN_MS = 1500;
const lastEmoteAt = new Map<string, number>();

/**
 * Bot replies to a human emote with a friendly counter-emote after a beat.
 * This ONLY runs in bot games — when both players are real humans the server
 * just relays each player's actual emote and never injects extras.
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
/** Index from playerId to the room they're hosting (so we can clean up on disconnect). */
const playerToRoom = new Map<string, string>();

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // omits I, L, O, 0, 1 to avoid confusion
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_MS = 15 * 60 * 1000; // rooms older than 15 minutes are garbage-collected

function generateRoomCode(): string {
  // Keyspace is 31^6 ≈ 887M, so collisions among a small live set are vanishingly rare.
  // Loop until we find a free code (bounded only by Map.has being O(1)).
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
    }
    if (!rooms.has(code)) return code;
  }
  // Should be unreachable in practice; throw rather than silently colliding.
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
 * The bot performs strategic swaps (sending its highest cards to face-up) and
 * then confirms ready, ~1.5s after game start so the human sees the activity
 * play out naturally rather than instantly.
 */
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
      // Bot just picked up via the fallback path → it now owes a starter play.
      // Re-schedule so the bot commits its starter card.
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

    socket.on('join_queue', (data: { playerId: string; playerName: string }) => {
      const { playerId, playerName } = data;
      socketToPlayer.set(socket.id, playerId);

      const existing = queue.findIndex((e) => e.playerId === playerId);
      if (existing >= 0) queue.splice(existing, 1);

      queue.push({ socketId: socket.id, playerId, playerName });
      socket.emit('queue_joined');
      logger.info({ playerId, queueLen: queue.length }, 'Joined queue');

      if (queue.length >= 2) {
        const p1 = queue.shift()!;
        const p2 = queue.shift()!;
        const state = dealGame([p1.playerId, p2.playerId], [p1.playerName, p2.playerName]);

        games.set(state.gameId, state);
        playerToGame.set(p1.playerId, state.gameId);
        playerToGame.set(p2.playerId, state.gameId);

        for (const p of [p1, p2]) {
          const view = getGameView(state, p.playerId);
          io.to(p.socketId).emit('game_start', view);
        }

        logger.info({ gameId: state.gameId }, 'Game started');
      }
    });

    socket.on('start_bot_game', (data: { playerId: string; playerName: string }) => {
      const { playerId, playerName } = data;
      socketToPlayer.set(socket.id, playerId);

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

      const view = getGameView(state, playerId);
      socket.emit('game_start', view);

      logger.info({ gameId: state.gameId, botName }, 'Bot game started');

      // Schedule the bot's setup choices so the human sees the ready indicator
      // change after a brief "thinking" delay rather than instantly.
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

    socket.on('create_room', (data: { playerId: string; playerName: string }) => {
      const { playerId, playerName } = data;
      socketToPlayer.set(socket.id, playerId);

      reapStaleRooms();

      // If this player is already hosting a room, replace it (e.g. they reconnected
      // or pressed Create Room again). Stale codes get GC'd above.
      const oldCode = playerToRoom.get(playerId);
      if (oldCode) rooms.delete(oldCode);

      // Also pull them out of the public queue if they were waiting there.
      removeFromQueue(playerId);

      const code = generateRoomCode();
      const room: PrivateRoom = {
        code,
        creator: { socketId: socket.id, playerId, playerName },
        createdAt: Date.now(),
      };
      rooms.set(code, room);
      playerToRoom.set(playerId, code);

      socket.emit('room_created', { code });
      logger.info({ playerId, code }, 'Private room created');
    });

    socket.on('join_room', (data: { playerId: string; playerName: string; code: string }) => {
      const { playerId, playerName } = data;
      const code = (data.code ?? '').toUpperCase().trim();
      socketToPlayer.set(socket.id, playerId);

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

      // Consume the room — only one opponent can join.
      rooms.delete(code);
      playerToRoom.delete(room.creator.playerId);

      // Tear down any stale games either player might be in.
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

      // Find the host's CURRENT socket (they may have reconnected since creating the
      // room). If they have no live socket, the room is effectively dead — refund the
      // join attempt instead of dealing into the void.
      let hostSocketId: string | null = null;
      for (const [sid, p] of socketToPlayer.entries()) {
        if (p === room.creator.playerId) { hostSocketId = sid; break; }
      }
      if (!hostSocketId) {
        // Roll back: tear down the just-created game and tell the joiner.
        games.delete(state.gameId);
        playerToGame.delete(room.creator.playerId);
        playerToGame.delete(playerId);
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
        // Game just transitioned to playing — emit game_start so clients
        // animate the deal/start screen, then schedule bot if it's their turn.
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

    // Lightweight identification handshake — every client emits this on
     // (re)connect so the server can re-bind socket.id → playerId without
     // requiring a queue/room/game action first. Critical for private rooms:
     // if the host's socket blips while sharing the code, they reconnect with
     // a NEW socket.id, and the joiner's lookup needs to find the host's
     // current live socket to deliver game_start.
    // Emote broadcast — sender (or anyone in the game) emits a short emote;
    // we relay it to BOTH players (including the sender so their own bubble
    // animates in confirming the send). Validated against an allow-list to
    // prevent abuse, with a per-player cooldown to throttle spam.
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
      // Broadcast to every human in the game (including sender for echo).
      for (const orderedPid of state.playerOrder) {
        if (isBotId(orderedPid)) continue;
        for (const [sid, p] of socketToPlayer.entries()) {
          if (p === orderedPid) {
            io.to(sid).emit('emote_received', payload);
            break;
          }
        }
      }

      // Only schedule a bot auto-reply if the opponent is actually a bot. In
      // human-vs-human games we never inject extra emotes — each player only
      // sees the emotes the other player actually sent.
      const opponentId = state.playerOrder.find((id) => id !== pid);
      if (opponentId && isBotId(opponentId)) {
        scheduleBotEmote(io, data.gameId, opponentId);
      }
    });

    socket.on('register', (data: { playerId: string }) => {
      if (!data?.playerId) return;
      socketToPlayer.set(socket.id, data.playerId);
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
            games.delete(gameId);
            playerToGame.delete(pid);
            if (otherId) playerToGame.delete(otherId);
          }
        }
        const qi = queue.findIndex((e) => e.playerId === pid);
        if (qi >= 0) queue.splice(qi, 1);
        // NOTE: Intentionally do NOT delete hosted private rooms here. Mobile
        // clients routinely lose the WebSocket while the user switches apps to
        // share the room code with a friend; killing the room on every blip
        // produces the dreaded "Room not found" right when the friend types it
        // in. The room is GC'd by reapStaleRooms() once it exceeds ROOM_TTL_MS,
        // which gives plenty of time for a real handoff. When the joiner later
        // tries to enter, the server checks for the host's CURRENT live socket
        // (via socketToPlayer) and rolls back the join if the host is truly
        // gone, so a stale room can never deal into the void.
        socketToPlayer.delete(socket.id);
      }
    });
  });

  // Periodic GC sweep so abandoned rooms (host left tab open then closed laptop, etc.)
  // don't linger past their TTL even with no incoming traffic.
  setInterval(reapStaleRooms, 60 * 1000).unref();

  logger.info('Socket.io game server initialized');
}
