import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { resolveApiBaseUrl } from '@/lib/apiUrl';

export interface Card {
  id: string;
  value: number;
  suit: 'H' | 'D' | 'C' | 'S';
}

export interface LastEvent {
  type: 'normal' | 'reset' | 'burn' | 'set_complete' | 'pickup' | 'face_down_bust';
  playerId: string;
  card?: Card;
  /** How many cards were played in this single move (1=single, 2=double, 3=triple, 4=quadruple). */
  playedCount?: number;
  burned?: boolean;
  extraTurn?: boolean;
  /** True when the play originated from the blind face-down row. Triggers a flip-reveal animation. */
  wasFaceDown?: boolean;
  /** For face-down reveals: the card that was on top of the pile BEFORE the reveal (used by the comparison animation). */
  previousTop?: Card;
}

export interface GameView {
  gameId: string;
  myPlayerId: string;
  opponentPlayerId: string;
  opponentName: string;
  myHand: Card[];
  myFaceUp: Card[];
  myFaceDownCount: number;
  myFaceDownIds: string[];
  opponentHandCount: number;
  opponentFaceUp: Card[];
  opponentFaceDownCount: number;
  discardPile: Card[];
  deckCount: number;
  currentPlayerId: string;
  isMyTurn: boolean;
  phase: 'setup' | 'playing' | 'finished';
  winner?: string;
  canFastPlay: boolean;
  lastEvent?: LastEvent;
  myReady?: boolean;
  opponentReady?: boolean;
  /** True when this player owes a starter play after picking up the pile. They must commit one card (any value, no specials) to restart the pile. */
  mustPlayStarter?: boolean;
  /**
   * Set to the playerId of whoever drew from the deck on this update, or null if no draw occurred.
   * The client uses this to trigger the draw animation only for the local player.
   */
  drawPlayerId?: string | null;
  /**
   * Unique opaque token that changes on every draw event (even consecutive draws by the same player).
   * The client keys its draw-animation `useEffect` on this field so two draws in a row both fire.
   */
  drawEventId?: string | null;
}

interface GameContextType {
  playerId: string;
  playerName: string;
  setPlayerName: (name: string) => Promise<void>;
  gameView: GameView | null;
  isInQueue: boolean;
  queueSeconds: number;
  onlineCount: number;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  opponentDisconnected: boolean;
  /** True while the opponent has temporarily lost connection but is within the grace period. */
  opponentReconnecting: boolean;
  joinQueue: () => void;
  quickPlayBot: () => void;
  cancelQueue: () => void;
  /** Code of the private room this player is currently hosting (null otherwise). */
  hostedRoomCode: string | null;
  /** Most recent room error message (e.g. "Room not found"). Cleared on next action. */
  roomError: string | null;
  createRoom: () => void;
  joinRoom: (code: string) => void;
  cancelRoom: () => void;
  clearRoomError: () => void;
  playCard: (cardId: string) => void;
  playCards: (cardIds: string[]) => void;
  pickupPile: () => void;
  swapCard: (handCardId: string, faceUpCardId: string) => void;
  setFaceUp: (faceUpIds: string[]) => void;
  confirmSetup: () => void;
  clearGame: () => void;
  leaveGame: () => void;
  /** Send an emote to the opponent. Allow-listed by the server. */
  sendEmote: (emote: string) => void;
  /**
   * Floating emote bubble for the local player (driven only from the socket —
   * never from React effects keyed on `gameView`, so card plays cannot replay
   * the same emote).
   */
  myEmoteBubble: { emote: string; key: number } | null;
  /** Floating emote bubble for the opponent. */
  opponentEmoteBubble: { emote: string; key: number } | null;
}

const GameContext = createContext<GameContextType | null>(null);

const generatePlayerId = (): string =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;

const VALUE_LABELS: Record<number, string> = {
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

export function getCardLabel(value: number): string {
  return VALUE_LABELS[value] ?? String(value);
}

export function getSuitSymbol(suit: Card['suit']): string {
  const symbols: Record<Card['suit'], string> = { H: '♥', D: '♦', C: '♣', S: '♠' };
  return symbols[suit];
}

export function isRedSuit(suit: Card['suit']): boolean {
  return suit === 'H' || suit === 'D';
}

export function GameProvider({
  children,
  gameCenterId,
}: {
  children: React.ReactNode;
  /** Game Center player ID from GameCenterContext, if authenticated. */
  gameCenterId?: string | null;
}) {
  const [playerId, setPlayerId] = useState<string>('');
  const [playerName, setPlayerNameState] = useState<string>('Player');
  const [gameView, setGameView] = useState<GameView | null>(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueSeconds, setQueueSeconds] = useState(0);
  const [onlineCount, setOnlineCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [opponentReconnecting, setOpponentReconnecting] = useState(false);
  const [hostedRoomCode, setHostedRoomCode] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [myEmoteBubble, setMyEmoteBubble] = useState<{ emote: string; key: number } | null>(null);
  const [opponentEmoteBubble, setOpponentEmoteBubble] = useState<{ emote: string; key: number } | null>(null);
  const emoteCounterRef = useRef(0);
  const myEmoteBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentEmoteBubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const queueTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep a ref to the latest gameCenterId so join callbacks always have fresh value
  const gameCenterIdRef = useRef<string | null | undefined>(gameCenterId);
  useEffect(() => { gameCenterIdRef.current = gameCenterId; }, [gameCenterId]);

  const clearEmoteBubbleTimers = useCallback(() => {
    if (myEmoteBubbleTimerRef.current) {
      clearTimeout(myEmoteBubbleTimerRef.current);
      myEmoteBubbleTimerRef.current = null;
    }
    if (opponentEmoteBubbleTimerRef.current) {
      clearTimeout(opponentEmoteBubbleTimerRef.current);
      opponentEmoteBubbleTimerRef.current = null;
    }
    setMyEmoteBubble(null);
    setOpponentEmoteBubble(null);
  }, []);

  useEffect(() => () => {
    if (myEmoteBubbleTimerRef.current) clearTimeout(myEmoteBubbleTimerRef.current);
    if (opponentEmoteBubbleTimerRef.current) clearTimeout(opponentEmoteBubbleTimerRef.current);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      let pid = await AsyncStorage.getItem('playerId');
      let pname = await AsyncStorage.getItem('playerName');
      if (!pid) {
        pid = generatePlayerId();
        await AsyncStorage.setItem('playerId', pid);
      }
      if (!pname) pname = 'Shadow';
      if (mounted) {
        setPlayerId(pid);
        setPlayerNameState(pname);
      }
    };

    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!playerId) return;

    const url = resolveApiBaseUrl();
    if (__DEV__) {
      console.info('[Game] Socket.io →', url, '(path /api/socket.io)');
    }

    const socket = io(url, {
      path: '/api/socket.io',
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      // Re-identify ourselves on every (re)connect so the server can route
      // private-room joins and game updates to our current socket.id even if
      // we briefly lost connectivity (app backgrounded, network blip, etc).
      socket.emit('register', { playerId, gameCenterId: gameCenterIdRef.current ?? undefined });
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      setIsInQueue(false);
      setOnlineCount(0);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    });

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('online_count', (count: number) => {
      setOnlineCount(count);
    });

    socket.on('queue_joined', () => {
      setIsInQueue(true);
      setQueueSeconds(0);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      queueTimerRef.current = setInterval(() => {
        setQueueSeconds((s) => s + 1);
      }, 1000);
    });

    socket.on('queue_cancelled', () => {
      setIsInQueue(false);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    });

    socket.on('game_start', (view: GameView) => {
      setIsInQueue(false);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      setOpponentDisconnected(false);
      setOpponentReconnecting(false);
      setHostedRoomCode(null);
      setRoomError(null);
      clearEmoteBubbleTimers();
      setGameView(view);
    });

    socket.on('game_restored', (view: GameView) => {
      setOpponentDisconnected(false);
      setOpponentReconnecting(false);
      clearEmoteBubbleTimers();
      setGameView(view);
    });

    socket.on('opponent_reconnecting', () => {
      setOpponentReconnecting(true);
      setOpponentDisconnected(false);
    });

    socket.on('opponent_reconnected', () => {
      setOpponentReconnecting(false);
      setOpponentDisconnected(false);
    });

    socket.on('room_created', (data: { code: string }) => {
      setHostedRoomCode(data.code);
      setRoomError(null);
    });

    socket.on('room_cancelled', () => {
      setHostedRoomCode(null);
    });

    socket.on('room_error', (data: { message: string }) => {
      setRoomError(data.message);
    });

    socket.on('game_update', (view: GameView) => {
      setGameView(view);
    });

    socket.on('opponent_disconnected', () => {
      setOpponentDisconnected(true);
      setOpponentReconnecting(false);
    });

    socket.on('play_error', (data: { message: string }) => {
      console.warn('Play error:', data.message);
    });

    socket.on('emote_received', (data: { playerId: string; emote: string; ts: number }) => {
      emoteCounterRef.current += 1;
      const key = emoteCounterRef.current;
      const isMine = data.playerId === playerId;
      if (isMine) {
        if (myEmoteBubbleTimerRef.current) clearTimeout(myEmoteBubbleTimerRef.current);
        setMyEmoteBubble({ emote: data.emote, key });
        myEmoteBubbleTimerRef.current = setTimeout(() => {
          setMyEmoteBubble(null);
          myEmoteBubbleTimerRef.current = null;
        }, 3200);
      } else {
        if (opponentEmoteBubbleTimerRef.current) clearTimeout(opponentEmoteBubbleTimerRef.current);
        setOpponentEmoteBubble({ emote: data.emote, key });
        opponentEmoteBubbleTimerRef.current = setTimeout(() => {
          setOpponentEmoteBubble(null);
          opponentEmoteBubbleTimerRef.current = null;
        }, 3200);
      }
    });

    return () => {
      socket.disconnect();
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    };
  }, [playerId, clearEmoteBubbleTimers]);

  // When gameCenterId becomes available after the socket is already connected
  // (auth completes after initial connect), re-register so the server updates
  // its mapping.
  useEffect(() => {
    if (!playerId || !gameCenterId || !socketRef.current) return;
    if (socketRef.current.connected) {
      socketRef.current.emit('register', { playerId, gameCenterId });
    }
  }, [playerId, gameCenterId]);

  const setPlayerName = useCallback(async (name: string) => {
    setPlayerNameState(name);
    await AsyncStorage.setItem('playerName', name);
  }, []);

  const joinQueue = useCallback(() => {
    if (!socketRef.current || connectionStatus !== 'connected') return;
    socketRef.current.emit('join_queue', {
      playerId,
      playerName,
      gameCenterId: gameCenterIdRef.current ?? undefined,
    });
  }, [playerId, playerName, connectionStatus]);

  const quickPlayBot = useCallback(() => {
    if (!socketRef.current || connectionStatus !== 'connected') return;
    socketRef.current.emit('start_bot_game', {
      playerId,
      playerName,
      gameCenterId: gameCenterIdRef.current ?? undefined,
    });
  }, [playerId, playerName, connectionStatus]);

  const cancelQueue = useCallback(() => {
    socketRef.current?.emit('cancel_queue');
    setIsInQueue(false);
    if (queueTimerRef.current) clearInterval(queueTimerRef.current);
  }, []);

  const createRoom = useCallback(() => {
    if (!socketRef.current || connectionStatus !== 'connected') return;
    setRoomError(null);
    setHostedRoomCode(null);
    socketRef.current.emit('create_room', {
      playerId,
      playerName,
      gameCenterId: gameCenterIdRef.current ?? undefined,
    });
  }, [playerId, playerName, connectionStatus]);

  const joinRoom = useCallback((code: string) => {
    if (!socketRef.current || connectionStatus !== 'connected') return;
    const cleaned = code.toUpperCase().trim();
    if (cleaned.length === 0) {
      setRoomError('Enter a room code first.');
      return;
    }
    setRoomError(null);
    socketRef.current.emit('join_room', {
      playerId,
      playerName,
      code: cleaned,
      gameCenterId: gameCenterIdRef.current ?? undefined,
    });
  }, [playerId, playerName, connectionStatus]);

  const cancelRoom = useCallback(() => {
    socketRef.current?.emit('cancel_room');
    setHostedRoomCode(null);
  }, []);

  const clearRoomError = useCallback(() => setRoomError(null), []);

  const playCardsFn = useCallback((cardIds: string[]) => {
    if (!gameView || !socketRef.current || cardIds.length === 0) return;
    socketRef.current.emit('play_card', { gameId: gameView.gameId, cardIds });
  }, [gameView]);

  const playCardFn = useCallback((cardId: string) => {
    playCardsFn([cardId]);
  }, [playCardsFn]);

  const pickupPileFn = useCallback(() => {
    if (!gameView || !socketRef.current) return;
    socketRef.current.emit('pickup_pile', { gameId: gameView.gameId });
  }, [gameView]);

  const swapCardFn = useCallback((handCardId: string, faceUpCardId: string) => {
    if (!gameView || !socketRef.current) return;
    socketRef.current.emit('swap_card', { gameId: gameView.gameId, handCardId, faceUpCardId });
  }, [gameView]);

  const setFaceUpFn = useCallback((faceUpIds: string[]) => {
    if (!gameView || !socketRef.current) return;
    socketRef.current.emit('set_face_up', { gameId: gameView.gameId, faceUpIds });
  }, [gameView]);

  const confirmSetupFn = useCallback(() => {
    if (!gameView || !socketRef.current) return;
    socketRef.current.emit('confirm_setup', { gameId: gameView.gameId });
  }, [gameView]);

  const sendEmote = useCallback((emote: string) => {
    if (!gameView || !socketRef.current) return;
    socketRef.current.emit('send_emote', { gameId: gameView.gameId, emote });
  }, [gameView]);

  const clearGame = useCallback(() => {
    setGameView(null);
    setOpponentDisconnected(false);
    setOpponentReconnecting(false);
    clearEmoteBubbleTimers();
  }, [clearEmoteBubbleTimers]);

  // Forfeit the current match: tell the server to tear it down (so the
  // opponent gets a clean "opponent_disconnected" notice and the room frees
  // up) and then wipe local state so we route back to the lobby.
  const leaveGame = useCallback(() => {
    if (gameView && socketRef.current) {
      socketRef.current.emit('leave_game', { gameId: gameView.gameId });
    }
    setGameView(null);
    setOpponentDisconnected(false);
    setOpponentReconnecting(false);
    clearEmoteBubbleTimers();
  }, [gameView, clearEmoteBubbleTimers]);

  return (
    <GameContext.Provider
      value={{
        playerId,
        playerName,
        setPlayerName,
        gameView,
        isInQueue,
        queueSeconds,
        onlineCount,
        connectionStatus,
        opponentDisconnected,
        opponentReconnecting,
        joinQueue,
        quickPlayBot,
        cancelQueue,
        hostedRoomCode,
        roomError,
        createRoom,
        joinRoom,
        cancelRoom,
        clearRoomError,
        playCard: playCardFn,
        playCards: playCardsFn,
        pickupPile: pickupPileFn,
        swapCard: swapCardFn,
        setFaceUp: setFaceUpFn,
        confirmSetup: confirmSetupFn,
        clearGame,
        leaveGame,
        sendEmote,
        myEmoteBubble,
        opponentEmoteBubble,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextType {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
