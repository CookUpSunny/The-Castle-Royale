import { useEffect, useRef } from 'react';
import type { GameView } from '@/contexts/GameContext';
import { playSfx, preloadSfx } from '@/lib/sfx';

/**
 * First moments after a match is assigned: preload audio, then play one
 * fanfare (match start only — not on every card play).
 */
export function useWelcomeMatchSfx(gameView: GameView | null): void {
  const welcomedGameIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameView) {
      welcomedGameIdRef.current = null;
      return;
    }
    if (welcomedGameIdRef.current === gameView.gameId) return;
    welcomedGameIdRef.current = gameView.gameId;

    let cancelled = false;
    void (async () => {
      await preloadSfx();
      if (cancelled) return;
      playSfx('fanfare-epic');
    })();

    return () => {
      cancelled = true;
    };
  }, [gameView?.gameId]);
}
