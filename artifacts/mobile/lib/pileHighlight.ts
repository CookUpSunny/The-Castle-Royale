/** Drop-target radius. The pile lights only while the finger is strictly inside. */
export const PILE_HIGHLIGHT_RADIUS = 110;

export function isOverPile(
  x: number,
  y: number,
  pileX: number,
  pileY: number,
  radius = PILE_HIGHLIGHT_RADIUS,
): boolean {
  'worklet';
  const dx = x - pileX;
  const dy = y - pileY;
  return dx * dx + dy * dy < radius * radius;
}

/**
 * Highlight flips only when the card crosses the radius.
 * Returns null while the finger stays inside or stays outside.
 */
export function highlightOnThresholdCross(wasInside: boolean, isInside: boolean): boolean | null {
  if (wasInside === isInside) return null;
  return isInside;
}
