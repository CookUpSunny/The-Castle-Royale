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

/** Posted by the page after real draw calls. The tuned shader values are not part of this. */
export const JACKPOT_LIVE_MESSAGE = 'castle-live';
export const JACKPOT_LIVE_FRAMES = 3;
export const JACKPOT_LIVE_FADE_MS = 220;
export const JACKPOT_LIVE_FAIL_MS = 2800;

const JACKPOT_DRAW = 'gl.drawArrays(gl.TRIANGLES,0,6);';

/**
 * What sits behind the cards while the live layer starts.
 * `hold` is the flat felt. The still is only the failure and Reduce Motion fallback.
 */
export function jackpotBackdrop(input: {
  reduceMotion: boolean | null;
  failed: boolean;
}): 'still' | 'live' | 'hold' {
  if (input.failed || input.reduceMotion === true) return 'still';
  if (input.reduceMotion === false) return 'live';
  return 'hold';
}

export function isJackpotLiveMessage(data: string): boolean {
  return data === JACKPOT_LIVE_MESSAGE;
}

/**
 * Appends a ready signal after the existing draw call.
 * The owner's tuned numbers, shader, and burst stay as they are.
 * The landscape still photo stays hidden until that draw has happened.
 */
export function withJackpotLiveSignal(html: string): string {
  const hook = 'if(!window.__castleLiveSent){window.__castleLiveFrames=(window.__castleLiveFrames||0)+1;'
    + `if(window.__castleLiveFrames>=${JACKPOT_LIVE_FRAMES}){try{var __art=document.getElementById("art");if(__art)__art.style.opacity="1";`
    + `window.ReactNativeWebView.postMessage("${JACKPOT_LIVE_MESSAGE}");window.__castleLiveSent=1}catch(e){}}}`;
  const withDraw = html.includes(JACKPOT_DRAW) ? html.replace(JACKPOT_DRAW, `${JACKPOT_DRAW}${hook}`) : html;
  return withDraw.replace(
    '<img id="art" alt=""/>',
    '<img id="art" alt="" style="opacity:0"/>',
  );
}
