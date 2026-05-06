/**
 * Casino SFX via **expo-av** (Audio.Sound).
 *
 * We intentionally avoid expo-audio here: Expo Go ships expo-av on every
 * platform and it reliably plays bundled WAVs after `preloadSfx()` runs.
 * expo-audio is newer and may not initialise the native session the same
 * way inside Expo Go / published workflows.
 *
 * Flow:
 *   1. `preloadSfx()` — sets iOS/Android audio mode + loads every cue into
 *      memory (call once early from `_layout` + optionally await again).
 *   2. `playSfx(name)` — replayAsync from a tiny pool so overlaps don't clip.
 */
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';

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

function getSource(name: SfxName): number | null {
  try {
    switch (name) {
      case 'coin':
        return require('../assets/audio/coin.wav');
      case 'coin-stack':
        return require('../assets/audio/coin-stack.wav');
      case 'bell':
        return require('../assets/audio/bell.wav');
      case 'reset':
        return require('../assets/audio/reset.wav');
      case 'jackpot':
        return require('../assets/audio/jackpot.wav');
      case 'pickup':
        return require('../assets/audio/pickup.wav');
      case 'slot-bright':
        return require('../assets/audio/slot-alt-b-bright.wav');
      case 'fanfare-cathedral':
        return require('../assets/audio/fanfare-opt-e-cathedral.wav');
      case 'fanfare-epic':
        return require('../assets/audio/fanfare-epic.wav');
      case 'fanfare-victory':
        return require('../assets/audio/fanfare-victory.wav');
    }
  } catch (err) {
    console.warn('[sfx] failed to resolve asset', name, err);
    return null;
  }
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
// and on Expo Go iOS, hammering Sound.replayAsync from the JS thread within a
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
  sounds: Audio.Sound[];
  next: number;
}

const pools: Partial<Record<SfxName, PoolEntry>> = {};
let loadPromise: Promise<void> | null = null;
let muted = false;
let audioModePromise: Promise<void> | null = null;

async function ensureAudioMode(): Promise<void> {
  if (audioModePromise) return audioModePromise;
  audioModePromise = (async () => {
    try {
      await Audio.setAudioModeAsync({
        // Critical on iOS: true routes playback to earpiece and breaks speaker SFX.
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.warn('[sfx] setAudioModeAsync failed', e);
    }
  })();
  return audioModePromise;
}

/**
 * Load every WAV into decoded `Sound` instances. Safe to call multiple times.
 * Run from root layout after fonts so Expo Go has a warm cache before `/game`.
 */
export async function preloadSfx(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
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
              const { sound } = await Audio.Sound.createAsync(
                src,
                { shouldPlay: false, volume: vol, isMuted: false },
                null,
                true,
              );
              return sound;
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
    await sound.replayAsync();
  } catch (err) {
    try {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch (e2) {
      console.warn('[sfx] play failed', name, e2);
    }
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
