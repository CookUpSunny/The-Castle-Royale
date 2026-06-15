/**
 * Casino SFX via **expo-audio** (AudioPlayer).
 *
 * Flow:
 *   1. `preloadSfx()` — sets iOS/Android audio mode + loads every cue into
 *      memory (call once early from `_layout` + optionally await again).
 *   2. `playSfx(name)` — seekTo(0)+play from a tiny pool so overlaps don't clip.
 */
// expo-audio depends on the ExponentAV native module which is not bundled in
// standard Expo Go. Guard the require so a missing native module degrades to
// silent no-op rather than crashing the app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _audio: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _audio = require('expo-audio');
} catch {
  // Native module unavailable — audio disabled silently.
}

export type SfxName =
  | 'coin'
  | 'coin-stack'
  | 'bell'
  | 'reset'
  | 'jackpot'
  | 'pickup'
  | 'slot-bright'
  | 'fanfare-cathedral'
  | 'fanfare-epic'
  | 'fanfare-victory';

// TODO: Add real .wav/.m4a files to assets/audio/ and wire them up here.
// Each case should return: require('../assets/audio/<name>.wav') as number
function getSource(_name: SfxName): number | null {
  return null;
}

const VOLUMES: Partial<Record<SfxName, number>> = {
  coin: 0.9,
  'coin-stack': 0.95,
  bell: 1,
  reset: 0.75,
  jackpot: 1,
  pickup: 0.75,
  'slot-bright': 0.98,
  'fanfare-cathedral': 1,
  'fanfare-epic': 1,
  'fanfare-victory': 1,
};

const POOL_SIZE = 4;
// Per-cue minimum gap between successive triggers. Multiple game events can
// converge on the same cue in a single tick (e.g. burn + multi-play burst),
// and on Expo Go iOS, hammering play from the JS thread within a
// few ms of itself can overrun the native audio session and crash the app.
const SFX_THROTTLE_MS = 60;
const lastFiredAt = new Map<SfxName, number>();
const ALL_NAMES: SfxName[] = [
  'coin',
  'coin-stack',
  'bell',
  'reset',
  'jackpot',
  'pickup',
  'slot-bright',
  'fanfare-cathedral',
  'fanfare-epic',
  'fanfare-victory',
];

interface PoolEntry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sounds: any[];
  next: number;
}

const pools: Partial<Record<SfxName, PoolEntry>> = {};
let loadPromise: Promise<void> | null = null;
let muted = false;
let audioModePromise: Promise<void> | null = null;

async function ensureAudioMode(): Promise<void> {
  if (!_audio) return;
  if (audioModePromise) return audioModePromise;
  audioModePromise = (async () => {
    try {
      await _audio.setAudioModeAsync({
        // Critical on iOS: true routes playback to earpiece and breaks speaker SFX.
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        // Mix with other audio so SFX don't interrupt background music
        interruptionMode: 'mixWithOthers',
        shouldRouteThroughEarpiece: false,
      });
    } catch (e) {
      console.warn('[sfx] setAudioModeAsync failed', e);
    }
  })();
  return audioModePromise;
}

/**
 * Load every WAV into decoded `AudioPlayer` instances. Safe to call multiple times.
 * Run from root layout after fonts so Expo Go has a warm cache before `/game`.
 */
export async function preloadSfx(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    if (!_audio) return;
    await ensureAudioMode();
    await Promise.all(
      ALL_NAMES.map(async (name) => {
        const src = getSource(name);
        if (src == null) return;
        if (pools[name]?.sounds.length) return;

        const vol = VOLUMES[name] ?? 1;
        try {
          const sounds = await Promise.all(
            Array.from({ length: POOL_SIZE }, async () => {
              const player = _audio.createAudioPlayer(src, { downloadFirst: true });
              player.volume = vol;
              return player;
            }),
          );
          pools[name] = { sounds, next: 0 };
        } catch (err) {
          console.warn('[sfx] failed to load cue', name, err);
        }
      }),
    );
  })();

  return loadPromise;
}

async function playSfxAsync(name: SfxName): Promise<void> {
  if (muted) return;

  // Per-cue throttle so a fast burst of identical playSfx calls (haywire
  // event re-fires, burn + multi-play landing on the same tick, etc.) cannot
  // overrun the audio session.
  const now = Date.now();
  const last = lastFiredAt.get(name) ?? 0;
  if (now - last < SFX_THROTTLE_MS) return;
  lastFiredAt.set(name, now);

  try {
    await preloadSfx();
  } catch (e) {
    console.warn('[sfx] preload failed before play', name, e);
    return;
  }

  const pool = pools[name];
  if (!pool?.sounds.length) {
    console.warn('[sfx] no pool for', name);
    return;
  }

  const sound = pool.sounds[pool.next % pool.sounds.length]!;
  pool.next += 1;

  try {
    await sound.seekTo(0);
    sound.play();
  } catch (err) {
    console.warn('[sfx] play failed', name, err);
  }
}

/** Fire-and-forget playback (never blocks UI thread). */
export function playSfx(name: SfxName): void {
  void playSfxAsync(name);
}

export function setSfxMuted(next: boolean): void {
  muted = next;
}

export function isSfxMuted(): boolean {
  return muted;
}
