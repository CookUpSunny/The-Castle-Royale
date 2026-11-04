import { useEffect, useRef, useState } from 'react';
import type { GameView } from '@/contexts/GameContext';
import { endSequenceDelayMs, isLegalMatchEnd } from '@/lib/endSequence';

export interface EndGameParams {
  winner: string;
  myId: string;
  opponentName: string;
}

/**
 * Starts the end-game curtain only after a legal win and only once the
 * winning card's play animation has had time to finish.
 */
export function useEndCurtain(gameView: GameView | null, enabled: boolean) {
  const [active, setActive] = useState(false);
  const paramsRef = useRef<EndGameParams | null>(null);

  const legal = enabled && gameView != null && isLegalMatchEnd(gameView);
  const delay = endSequenceDelayMs(gameView?.lastEvent);
  const winner = gameView?.winner ?? '';
  const myId = gameView?.myPlayerId ?? '';
  const opponentName = gameView?.opponentName ?? '';

  useEffect(() => {
    if (!legal || active) return;
    const timer = setTimeout(() => {
      paramsRef.current = { winner, myId, opponentName };
      setActive(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [legal, active, delay, winner, myId, opponentName]);

  return { active, paramsRef };
}
