/** Vertical stops for the placing hand. One timeline, so the swoop is not overwritten. */
export const HAND_PLACE_MS = { swoop: 240, press: 120, release: 140, exit: 260 } as const;

export function handPlaceStops(pileY: number): {
  start: number;
  approach: number;
  press: number;
  release: number;
  exit: number;
} {
  return {
    start: pileY + 220,
    approach: pileY + 36,
    press: pileY + 48,
    release: pileY + 30,
    exit: pileY + 210,
  };
}
