/**
 * The match is over only when the winner has nothing left to play and the
 * shared draw deck is empty. Opponent cards may remain — that player lost.
 * A finished flag that arrives while the winner still holds a hand, face-up,
 * face-down, or undrawn deck card is not a legal end.
 */
export function isLegalMatchEnd(view: {
  phase: string;
  winner?: string;
  myPlayerId?: string;
  myHand: readonly unknown[];
  myFaceUp: readonly unknown[];
  myFaceDownCount: number;
  opponentHandCount: number;
  opponentFaceUp: readonly unknown[];
  opponentFaceDownCount: number;
  deckCount: number;
}): boolean {
  if (view.phase !== 'finished' || !view.winner) return false;
  if (view.deckCount > 0) return false;
  if (view.winner === view.myPlayerId) {
    return view.myHand.length === 0 && view.myFaceUp.length === 0 && view.myFaceDownCount === 0;
  }
  return (
    view.opponentHandCount === 0 &&
    view.opponentFaceUp.length === 0 &&
    view.opponentFaceDownCount === 0
  );
}

/**
 * Hold the board long enough for the winning play to finish animating.
 * The server marks the match finished in the same update that removes the
 * card, and starting the end curtain in that same turn covers the flip or
 * the flight while the card is still in play.
 *
 * Durations match the client presentations:
 *   face-down reveal ~2580ms, normal/reset flight ~870ms, burn beat ~1s.
 */
export function endSequenceDelayMs(event?: { type?: string; wasFaceDown?: boolean } | null): number {
  if (event?.wasFaceDown) return 2700;
  if (event?.type === 'burn' || event?.type === 'set_complete') return 1100;
  if (event?.type === 'normal' || event?.type === 'reset') return 980;
  return 700;
}
