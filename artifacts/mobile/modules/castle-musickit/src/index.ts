import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * JavaScript face of the local MusicKit module.
 *
 * Importing this file does not touch native code. Every call is a no-op off iOS
 * and a caught failure when the native module is missing (Expo Go, Android, web).
 * ApplicationMusicPlayer cannot set an app-only volume, so setAppleMusicVolume
 * reports that and callers pause for mute instead.
 */

export type AppleMusicAuthStatus =
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'notDetermined'
  | 'unavailable';

type NativeCastleMusicKit = {
  getAuthorizationStatus(): Promise<string>;
  requestAuthorization(): Promise<string>;
  canPlayCatalogContent(): Promise<boolean>;
  playSong(songId: string, loop: boolean): Promise<boolean>;
  playQueue(songIds: string[]): Promise<boolean>;
  pause(): Promise<void>;
  resume(): Promise<boolean>;
  stop(): Promise<void>;
  setVolume(volume: number): Promise<boolean>;
};

const PLAY_TIMEOUT_MS = 12000;

let native: NativeCastleMusicKit | null | undefined;
/** True after a play attempt. Stop stays a no-op until then so bundled playback never touches MusicKit. */
let catalogEngaged = false;

function loadNative(): NativeCastleMusicKit | null {
  if (native) return native;
  if (native === null) return null;
  if (Platform.OS !== 'ios') {
    native = null;
    return null;
  }
  try {
    const loaded = requireNativeModule<NativeCastleMusicKit>('CastleMusicKit');
    native = loaded;
    return loaded;
  } catch {
    native = null;
    return null;
  }
}

function statusFrom(value: unknown): AppleMusicAuthStatus {
  switch (value) {
    case 'authorized':
    case 'denied':
    case 'restricted':
    case 'notDetermined':
      return value;
    default:
      return 'unavailable';
  }
}

function isCatalogId(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

function fallbackAfter<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

export function isAppleMusicKitAvailable(): boolean {
  return loadNative() != null;
}

export async function getAppleMusicAuthorizationStatus(): Promise<AppleMusicAuthStatus> {
  const mod = loadNative();
  if (!mod) return 'unavailable';
  try {
    return statusFrom(await mod.getAuthorizationStatus());
  } catch {
    return 'unavailable';
  }
}

export async function requestAppleMusicAuthorization(): Promise<AppleMusicAuthStatus> {
  const mod = loadNative();
  if (!mod) return 'unavailable';
  try {
    return statusFrom(await mod.requestAuthorization());
  } catch {
    return 'unavailable';
  }
}

export async function canPlayAppleMusicCatalog(): Promise<boolean> {
  const mod = loadNative();
  if (!mod) return false;
  try {
    return (await mod.canPlayCatalogContent()) === true;
  } catch {
    return false;
  }
}

async function stopQuietly(mod: NativeCastleMusicKit): Promise<void> {
  try {
    await mod.stop();
  } catch {
    // Stopping is best-effort. Playback already failed or timed out.
  }
}

export async function playAppleMusicSong(songId: string, loop: boolean): Promise<boolean> {
  const mod = loadNative();
  if (!mod || !isCatalogId(songId)) return false;
  catalogEngaged = true;
  const ok = await fallbackAfter(
    mod.playSong(songId, loop).then((value) => value === true).catch(() => false),
    PLAY_TIMEOUT_MS,
    false,
  );
  if (!ok) await stopQuietly(mod);
  return ok;
}

export async function playAppleMusicQueue(songIds: readonly string[]): Promise<boolean> {
  const mod = loadNative();
  if (!mod || songIds.length === 0 || songIds.some((id) => !isCatalogId(id))) return false;
  catalogEngaged = true;
  const ok = await fallbackAfter(
    mod.playQueue([...songIds]).then((value) => value === true).catch(() => false),
    PLAY_TIMEOUT_MS,
    false,
  );
  if (!ok) await stopQuietly(mod);
  return ok;
}

export async function pauseAppleMusic(): Promise<void> {
  const mod = loadNative();
  if (!mod || !catalogEngaged) return;
  try {
    await mod.pause();
  } catch {
    // Mute still applies to bundled audio.
  }
}

export async function resumeAppleMusic(): Promise<boolean> {
  const mod = loadNative();
  if (!mod || !catalogEngaged) return false;
  try {
    return (await mod.resume()) === true;
  } catch {
    return false;
  }
}

export async function stopAppleMusic(): Promise<void> {
  const mod = loadNative();
  if (!mod || !catalogEngaged) return;
  await stopQuietly(mod);
}

/** Always false. MusicKit's application player has no app-only gain. */
export async function setAppleMusicVolume(volume: number): Promise<boolean> {
  const mod = loadNative();
  if (!mod || !catalogEngaged || !Number.isFinite(volume)) return false;
  try {
    return (await mod.setVolume(volume)) === true;
  } catch {
    return false;
  }
}
