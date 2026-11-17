/** One press. Near-imperceptible, no bounce. */
export const PRESS_SCALE = 0.97;
export const PRESS_MS = 120;
export const PRESS_RELEASE_MS = 160;
export const PRESS_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)';
export const PRESS_OPACITY = 0.88;

/** Selection tick only when the finger lands on a different fan card. */
export function scrubTick(prev: number | null, next: number): boolean {
  'worklet';
  if (prev == null || next < 0 || next === prev) return false;
  return true;
}
