import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameView } from '@/contexts/GameContext';
import { playSfx } from '@/lib/sfx';

interface Snapshot {
  gameId: string;
  selfHand: number;
  selfFaceUp: number;
  selfFaceDown: number;
  oppHand: number;
  oppFaceUp: number;
  oppFaceDown: number;
}

export type CastleOverlayPayload = {
  tier: 'top' | 'bottom';
  who: string;
  isMine: boolean;
  /** Counter that increments on every overlay event so React can re-mount cleanly. */
  key: number;
};

interface UseGameMilestonesResult {
  /** Increments each time the local player drains their hand (top castle reached). */
  selfTopPulse: number;
  /** Increments each time the local player drains their face-up row (bottom castle reached). */
  selfBottomPulse: number;
  /** Increments each time the opponent drains their hand (top castle reached). */
  oppTopPulse: number;
  /** Increments each time the opponent drains their face-up row (bottom castle reached). */
  oppBottomPulse: number;
  /** Active celebration overlay payload (null when nothing is animating). */
  overlay: CastleOverlayPayload | null;
  /** Clears the active overlay; call from the overlay's `onComplete`. */
  dismissOverlay: () => void;
}

/**
 * Detects "castle layer" milestones and plays fanfare SFX once per milestone:
 *   • TOP CASTLE (first) — cathedral peal (`fanfare-cathedral` / opt E WAV).
 *   • BOTTOM CASTLE — epic brass stinger (`fanfare-epic`).
 *
 * The two transitions we care about:
 *   • TOP CASTLE  — the player just emptied their hand, but still has
 *     face-up cards left to play. ("You broke through to your top castle.")
 *   • BOTTOM CASTLE — the player just emptied their face-up row, hand was
 *     already empty, and face-down cards remain. ("You're down to your
 *     bottom castle — last layer before victory.")
 *
 * Triggers fire for both the local player and the opponent so both
 * clients see the same overlay simultaneously. We compare the new
 * `gameView` snapshot against the previous one — if a count drained
 * across the threshold this tick, the milestone fires once.
 *
 * Initial mount captures the current snapshot as the baseline so that
 * orientation flips (which remount the consumer) never re-replay a
 * milestone that already fired before the rotation.
 */
export function useGameMilestones(gameView: GameView | null): UseGameMilestonesResult {
  const [selfTopPulse, setSelfTopPulse] = useState(0);
  const [selfBottomPulse, setSelfBottomPulse] = useState(0);
  const [oppTopPulse, setOppTopPulse] = useState(0);
  const [oppBottomPulse, setOppBottomPulse] = useState(0);
  const [overlay, setOverlay] = useState<CastleOverlayPayload | null>(null);
  const overlayCounterRef = useRef(0);
  const prevRef = useRef<Snapshot | null>(null);

  const milestoneSnapshot = useMemo(() => {
    if (!gameView) return null;
    return {
      gameId: gameView.gameId,
      selfHand: gameView.myHand.length,
      selfFaceUp: gameView.myFaceUp.length,
      selfFaceDown: gameView.myFaceDownCount,
      oppHand: gameView.opponentHandCount,
      oppFaceUp: gameView.opponentFaceUp.length,
      oppFaceDown: gameView.opponentFaceDownCount,
      oppName: gameView.opponentName ?? 'OPPONENT',
    };
  }, [
    gameView?.gameId,
    gameView?.myHand.length,
    gameView?.myFaceUp.length,
    gameView?.myFaceDownCount,
    gameView?.opponentHandCount,
    gameView?.opponentFaceUp.length,
    gameView?.opponentFaceDownCount,
    gameView?.opponentName,
  ]);

  useEffect(() => {
    if (!milestoneSnapshot) {
      prevRef.current = null;
      return;
    }

    const cur: Snapshot = {
      gameId: milestoneSnapshot.gameId,
      selfHand: milestoneSnapshot.selfHand,
      selfFaceUp: milestoneSnapshot.selfFaceUp,
      selfFaceDown: milestoneSnapshot.selfFaceDown,
      oppHand: milestoneSnapshot.oppHand,
      oppFaceUp: milestoneSnapshot.oppFaceUp,
      oppFaceDown: milestoneSnapshot.oppFaceDown,
    };

    const prev = prevRef.current;
    prevRef.current = cur;

    // First snapshot for this game (or new game) — capture-only, no fire.
    // This guard also dedupes orientation rotations: if the consumer
    // remounts mid-game with the same gameId, prev will be stale at
    // the next event, but the very first effect cycle just records
    // current state without firing.
    if (!prev || prev.gameId !== cur.gameId) return;

    let nextOverlay: CastleOverlayPayload | null = null;
    const oppName = milestoneSnapshot.oppName;

    // Self top: hand was non-empty, is now empty, face-up still has cards.
    if (prev.selfHand > 0 && cur.selfHand === 0 && cur.selfFaceUp > 0) {
      setSelfTopPulse((n) => n + 1);
      playSfx('fanfare-cathedral');
      overlayCounterRef.current += 1;
      nextOverlay = { tier: 'top', who: 'YOU', isMine: true, key: overlayCounterRef.current };
    }

    // Self bottom: face-up was non-empty, is now empty, hand also empty,
    // face-down cards remain. Bottom castle is the final layer — bigger
    // celebration than the top milestone.
    if (
      prev.selfFaceUp > 0 &&
      cur.selfFaceUp === 0 &&
      cur.selfHand === 0 &&
      cur.selfFaceDown > 0
    ) {
      setSelfBottomPulse((n) => n + 1);
      playSfx('fanfare-epic');
      overlayCounterRef.current += 1;
      nextOverlay = { tier: 'bottom', who: 'YOU', isMine: true, key: overlayCounterRef.current };
    }

    // Opponent top.
    if (prev.oppHand > 0 && cur.oppHand === 0 && cur.oppFaceUp > 0) {
      setOppTopPulse((n) => n + 1);
      playSfx('fanfare-cathedral');
      overlayCounterRef.current += 1;
      nextOverlay = { tier: 'top', who: oppName, isMine: false, key: overlayCounterRef.current };
    }

    // Opponent bottom.
    if (
      prev.oppFaceUp > 0 &&
      cur.oppFaceUp === 0 &&
      cur.oppHand === 0 &&
      cur.oppFaceDown > 0
    ) {
      setOppBottomPulse((n) => n + 1);
      playSfx('fanfare-epic');
      overlayCounterRef.current += 1;
      nextOverlay = { tier: 'bottom', who: oppName, isMine: false, key: overlayCounterRef.current };
    }

    if (nextOverlay) setOverlay(nextOverlay);
  }, [milestoneSnapshot]);

  const dismissOverlay = useCallback(() => setOverlay(null), []);

  return {
    selfTopPulse,
    selfBottomPulse,
    oppTopPulse,
    oppBottomPulse,
    overlay,
    dismissOverlay,
  };
}
