/** Overlay holds. Reduced Motion keeps a short fade, then gets out of the way. */
export const OVERLAY_HOLD = {
  faceDownReveal: { full: 2580, reduced: 1100 },
  multiPlayBurst: { full: 1700, reduced: 900 },
} as const;

export function overlayHoldMs(
  kind: keyof typeof OVERLAY_HOLD,
  reduceMotion: boolean,
): number {
  const row = OVERLAY_HOLD[kind];
  return reduceMotion ? row.reduced : row.full;
}

/** Opacity fades that explain a state change stay between 150 and 200ms. */
export function softenedFadeMs(fullMs: number, reduceMotion: boolean): number {
  if (!reduceMotion) return fullMs;
  return Math.min(Math.max(fullMs, 150), 200);
}
