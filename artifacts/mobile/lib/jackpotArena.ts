/** Casino Green's slot. The id stays so saved tables and the free gate carry over. */
export const JACKPOT_ARENA_ID = 'greenTable' as const;
export const JACKPOT_ARENA_NAME = 'Jackpot';
export const JACKPOT_FELT = '#06120c';

/** The owner's page call. The trailing true keeps iOS WKWebView from hanging. */
export const JACKPOT_BURST_SCRIPT = 'window.castleJackpot && window.castleJackpot(); true;';

export const JACKPOT_ORIGIN_WHITELIST = ['about:blank', 'data:'] as const;

export function jackpotPage(width: number, height: number): 'portrait' | 'landscape' {
  return width > height ? 'landscape' : 'portrait';
}

export function jackpotLoadAllowed(url: string): boolean {
  if (!url || url === 'about:blank') return true;
  return url.startsWith('about:') || url.startsWith('data:');
}

/**
 * The WebView runs only for an active Jackpot match, in the foreground,
 * when the player has not asked for reduced motion, and the view has not failed.
 */
export function shouldMountJackpotWebView(input: {
  arenaActive: boolean;
  appActive: boolean;
  reduceMotion: boolean;
  failed: boolean;
}): boolean {
  return input.arenaActive && input.appActive && !input.reduceMotion && !input.failed;
}
