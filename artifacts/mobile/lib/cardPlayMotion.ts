export interface Point {
  x: number;
  y: number;
}

export function cardMayPlay(
  card: { value: number },
  pile: readonly { value: number }[],
  mustPlayStarter = false,
): boolean {
  if (mustPlayStarter) return true;
  if (pile.length === 0) return true;
  const top = pile[pile.length - 1]!;
  if (card.value === 2 || card.value === 10) return true;
  if (top.value === 2) return true;
  return card.value >= top.value;
}

/** An upward flick at least this fast counts as a play, same as a lift. */
export const FLICK_UP_VELOCITY = -900;

/**
 * A drag that stays in the hand snaps back. A drag over the pile, lifted
 * above the hand, or flicked upward plays only when the card is legal.
 */
export function resolveDragRelease(input: {
  x: number;
  y: number;
  pileX: number;
  pileY: number;
  handTop: number;
  playable: boolean;
  velocityY?: number;
}): 'play' | 'snap' {
  if (!input.playable) return 'snap';
  const dx = input.x - input.pileX;
  const dy = input.y - input.pileY;
  const overPile = dx * dx + dy * dy < 120 * 120;
  const lifted = input.y < input.handTop - 12;
  const flickedUp = (input.velocityY ?? 0) < FLICK_UP_VELOCITY;
  return overPile || lifted || flickedUp ? 'play' : 'snap';
}

/** Quadratic control point above the straight path, from the player's or opponent's side. */
export function playArc(start: Point, end: Point, side: 'self' | 'opponent'): Point {
  const arcLift = 84;
  return {
    x: (start.x + end.x) / 2 + (side === 'self' ? 18 : -18),
    y: Math.min(start.y, end.y) - Math.max(arcLift, Math.abs(start.y - end.y) * 0.35),
  };
}
