/** Cold-launch intro. One play, then the home screen. */
export const INTRO_FALLBACK_MS = 6_000;

export function shouldPlayLaunchIntro(input: {
  reduceMotion: boolean;
  alreadyPlayed: boolean;
}): boolean {
  return !input.reduceMotion && !input.alreadyPlayed;
}
