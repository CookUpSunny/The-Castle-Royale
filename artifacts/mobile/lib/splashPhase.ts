export const SPLASH_PHASES = ['intro', 'gravity', 'studio', 'done'] as const;

export type SplashPhase = (typeof SPLASH_PHASES)[number];

/**
 * The designed chain is about 13s (intro fade, gravity, studio wordmark).
 * 18s leaves headroom on a slow device and still leaves the home screen if a
 * splash animation callback never fires.
 */
export const SPLASH_CHAIN_TIMEOUT_MS = 18_000;

/** Fonts must not block the navigator forever if expo-font never settles. */
export const FONT_GATE_TIMEOUT_MS = 8_000;

/** Only move forward. A late splash callback cannot reopen an earlier phase. */
export function advanceSplashPhase(current: SplashPhase, next: SplashPhase): SplashPhase {
  if (SPLASH_PHASES.indexOf(next) <= SPLASH_PHASES.indexOf(current)) return current;
  return next;
}
