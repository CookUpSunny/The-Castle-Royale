/**
 * MusicContext — background music player
 *
 * Two modes:
 *  • Splash  — "Sparks Fly" loops on the lobby screen (4 s fade-in, 6 s
 *              fade-out before each loop boundary, seamless restart).
 *  • Match   — arena-specific track when arena has a dedicated song (3 s fade-in,
 *              seamless loop); otherwise shuffled playlist of tracks 1–4.
 *
 * ─── TRACKS ──────────────────────────────────────────────────────────────────
 *   track1.m4a   — Sparks In These Eyes  ← greenTable arena ("Casino Green")
 *   track2.m4a   — Sparks Fly           ← splash screen track
 *   track3.m4a   — Wife Changing Money  ┐ shuffled playlist for arenas
 *   track4.m4a   — Go! Go! Go!          ┘ without a dedicated track
 *   oasis.m4a    — Underground Kingdom  ← lightning arena  ("An Oasis in the Cave")
 *   flamingo.m4a — Go! Go! Go!          ← classic arena   ("The Flamingo Floor")
 *   olympus.m4a  — Winning Man Anthem   ← royal arena     ("Olympus Throne")
 *   cosmic.m4a   — All In               ← cosmic arena    ("Cosmic Sanctum")
 *   matrix.m4a  — Whispers Dipped in Dye ← matrix arena  ("Matrix")
 *
 * To add a new arena track: copy the .m4a into assets/music/, require() it in
 * TRACKS below, and add one line to ARENA_TRACK mapping the ArenaId → index.
 * Catalog ids for the same songs live in lib/appleMusicCatalog.ts. On iOS,
 * an authorized Apple Music subscriber streams those ids through MusicKit.
 * Everyone else keeps the bundled files. See docs/MUSICKIT.md.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AudioPlayer } from 'expo-audio';
import type { AudioStatus } from 'expo-audio';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { ArenaId } from './CosmeticsContext';
import {
  SPLASH_CATALOG_ID,
  catalogSelectionForArena,
  resolveCatalogPlayback,
} from '../lib/appleMusicCatalog';
import {
  canPlayAppleMusicCatalog,
  getAppleMusicAuthorizationStatus,
  isAppleMusicKitAvailable,
  pauseAppleMusic,
  playAppleMusicQueue,
  playAppleMusicSong,
  requestAppleMusicAuthorization,
  resumeAppleMusic,
  setAppleMusicVolume,
  stopAppleMusic,
  type AppleMusicAuthStatus,
} from '../modules/castle-musickit/src';
import { setSfxMuted } from '../lib/sfx';

// expo-audio depends on the ExponentAV native module which is not bundled in
// standard Expo Go. Guard the require so a missing native module degrades to
// silent no-op rather than crashing the app.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _audio: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  _audio = require('expo-audio');
} catch {
  // Native module unavailable — music disabled silently.
}

const MUTED_KEY           = '@castleroyale_music_muted';
const VOLUME_KEY          = '@castleroyale_volume';
const APPLE_MUSIC_KEY     = '@castleroyale_apple_music';
const AUTH_WAIT_MS        = 45000;
const SPLASH_FADE_STEPS   = 60;   // 60 × 100 ms = 6 000 ms (loop fade-out + stop fade-out)
const SPLASH_FADE_IN_STEPS = 40;  // 40 × 100 ms = 4 000 ms (opening fade-in only)
const MATCH_FADE_STEPS    = 10;   // 10 × 100 ms = 1 000 ms
const FAST_STOP_STEPS     = 14;   // 14 × 100 ms = 1 400 ms (fast match-transition fade-out)
const FADE_MS             = 100;
const SPLASH_FADE_MS    = SPLASH_FADE_STEPS * FADE_MS; // 6 000 ms — fade-out trigger point
const SPLASH_TRACK_IDX  = 1;    // track2.wav — Sparks Fly
const OASIS_TRACK_IDX    = 4;    // oasis.wav    — Underground Kingdom
const FLAMINGO_TRACK_IDX = 5;    // flamingo.wav — Go! Go! Go!
const OLYMPUS_TRACK_IDX  = 6;    // olympus.wav  — Winning Man Anthem

const CASINO_TRACK_IDX  = 0;    // track1.m4a — Sparks In These Eyes (header). "Low Energy 2nd Wind" is not on the catalog.
const COSMIC_TRACK_IDX  = 7;    // cosmic.wav  — All In
const MATRIX_TRACK_IDX  = 8;    // matrix.wav  — Whispers Dipped in Dye

/**
 * Arena → TRACKS index.
 * Add one entry per new arena track — everything else is automatic.
 */
const ARENA_TRACK: Partial<Record<ArenaId, number>> = {
  greenTable: CASINO_TRACK_IDX,
  lightning:  OASIS_TRACK_IDX,
  classic:    FLAMINGO_TRACK_IDX,
  royal:      OLYMPUS_TRACK_IDX,
  cosmic:     COSMIC_TRACK_IDX,
  matrix:     MATRIX_TRACK_IDX,
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TRACKS: number[] = [
  require('../assets/music/track1.m4a') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track2.m4a') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track3.m4a') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track4.m4a') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/oasis.m4a') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/flamingo.m4a') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/olympus.m4a') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/cosmic.m4a') as number,   // index 7 — All In
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/matrix.m4a') as number,  // index 8 — Whispers Dipped in Dye
];

// Shuffle queue only spans the generic playlist tracks; arena tracks are excluded.
const PLAYLIST_SIZE = 4;

export type VolumeLevel = 0.25 | 0.5 | 0.75 | 1.0;
const DEFAULT_VOLUME: VolumeLevel = 0.5;

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type MusicMode = 'idle' | 'splash' | 'match';
type OutputBackend = 'none' | 'bundled' | 'musickit';

export interface AppleMusicPreference {
  status: AppleMusicAuthStatus;
  canPlayCatalog: boolean;
}

function settleWithin<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
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

interface MusicContextValue {
  isMuted: boolean;
  isPlaying: boolean;
  volumeLevel: VolumeLevel;
  /** iOS preference. Defaults on. Android ignores it and keeps bundled playback. */
  appleMusicEnabled: boolean;
  toggleMute: () => void;
  setVolumeLevel: (v: VolumeLevel) => void;
  /**
   * Turn catalog streaming on or off. Turning it on asks for Apple Music
   * permission. That call is the settings path. Match start asks on its own.
   * Launch does not.
   */
  setAppleMusicEnabled: (enabled: boolean) => Promise<AppleMusicPreference>;
  /** Start the looping splash-screen track (Sparks Fly). No-op if already playing. */
  playSplashTrack: () => void;
  /**
   * Start in-match music. When arenaId has a dedicated track it loops that
   * single track (3 s fade-in); otherwise falls back to the shuffled playlist.
   * No-op if match music is already playing.
   */
  startMusic: (arenaId?: ArenaId) => void;
  stopMusic: () => void;
  /** Fade out and stop in ~1 400 ms — use when transitioning into a match. */
  stopMusicFast: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  isMuted: false,
  isPlaying: false,
  volumeLevel: DEFAULT_VOLUME,
  appleMusicEnabled: true,
  toggleMute: () => {},
  setVolumeLevel: () => {},
  setAppleMusicEnabled: async () => ({ status: 'unavailable', canPlayCatalog: false }),
  playSplashTrack: () => {},
  startMusic: () => {},
  stopMusic: () => {},
  stopMusicFast: () => {},
});

export function useMusicPlayer() {
  return useContext(MusicContext);
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted]                   = useState(false);
  const [isPlaying, setIsPlaying]               = useState(false);
  const [volumeLevelState, setVolumeLevelState] = useState<VolumeLevel>(DEFAULT_VOLUME);
  const [appleMusicEnabled, setAppleMusicEnabledState] = useState(true);

  const isMutedRef     = useRef(false);
  const volumeLevelRef = useRef<VolumeLevel>(DEFAULT_VOLUME);
  const appleMusicPrefRef = useRef(true);
  const applePrefTouchedRef = useRef(false);
  const soundRef       = useRef<AudioPlayer | null>(null);
  const fadeRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef     = useRef(true);
  const prefLoadedRef  = useRef(false);
  const playGen        = useRef(0);
  const backendRef     = useRef<OutputBackend>('none');
  const arenaRef       = useRef<ArenaId | undefined>(undefined);
  const wasMutedRef    = useRef(false);
  const onMuteChangedRef = useRef<(muted: boolean, becameAudible: boolean) => void>(() => {});

  // Guards against duplicate mode starts (prevents restart-on-remount bugs).
  const modeRef = useRef<MusicMode>('idle');

  // Splash-specific flags
  const splashActiveRef         = useRef(false);
  const splashFadeOutStartedRef = useRef(false);

  // Shuffle queue (tracks 0–3 only; not the arena tracks)
  const queueRef = useRef<number[]>(shuffleIndices(PLAYLIST_SIZE));
  const queuePos = useRef(0);

  // Non-null in arena-loop mode: didJustFinish replays this track index.
  const arenaLoopIdxRef = useRef<number | null>(null);

  // ─── Load persisted preferences ───────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(MUTED_KEY),
      AsyncStorage.getItem(VOLUME_KEY),
      AsyncStorage.getItem(APPLE_MUSIC_KEY),
    ]).then(([mutedVal, volumeVal, appleVal]) => {
      if (!mountedRef.current) return;
      prefLoadedRef.current = true;
      if (mutedVal === 'true') {
        isMutedRef.current = true;
        setSfxMuted(true);
        setIsMuted(true);
      }
      if (!applePrefTouchedRef.current && appleVal === 'off') {
        appleMusicPrefRef.current = false;
        setAppleMusicEnabledState(false);
      }
      const parsed = volumeVal ? parseFloat(volumeVal) : NaN;
      if (parsed === 0.25 || parsed === 0.5 || parsed === 0.75 || parsed === 1.0) {
        volumeLevelRef.current = parsed as VolumeLevel;
        setVolumeLevelState(parsed as VolumeLevel);
      }
    }).catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  // Keep live volume in sync when mute state changes
  useEffect(() => {
    isMutedRef.current = isMuted;
    setSfxMuted(isMuted);
    if (prefLoadedRef.current) {
      AsyncStorage.setItem(MUTED_KEY, isMuted ? 'true' : 'false').catch(() => {});
    }
    const becameAudible = wasMutedRef.current && !isMuted;
    wasMutedRef.current = isMuted;
    onMuteChangedRef.current(isMuted, becameAudible);
  }, [isMuted]);

  // ─── Core helpers ──────────────────────────────────────────────────────────

  const clearFade = useCallback(() => {
    if (fadeRef.current !== null) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  const unloadCurrent = useCallback(async () => {
    clearFade();
    if (soundRef.current) {
      const s = soundRef.current;
      soundRef.current = null;
      try { s.pause(); } catch {}
      try { s.remove(); } catch {}
    }
  }, [clearFade]);

  /**
   * Volume ramp.
   *   direction +1  →  fade in  (0 → ceiling)
   *   direction -1  →  fade out (ceiling → 0)
   *   steps controls duration: default 60 (6 s); pass MATCH_FADE_STEPS for 3 s.
   *   ceilingOverride — when set, uses this value instead of volumeLevelRef.current.
   *     Used by the splash fade-in to always reach 1.0 regardless of user preference.
   */
  const startFade = useCallback((direction: 1 | -1, onDone?: () => void, steps = SPLASH_FADE_STEPS, ceilingOverride?: number) => {
    clearFade();
    if (isMutedRef.current) {
      onDone?.();
      return;
    }
    const ceiling = ceilingOverride ?? volumeLevelRef.current;
    let vol       = direction === 1 ? 0 : ceiling;
    const step    = ceiling / steps;
    fadeRef.current = setInterval(() => {
      vol = direction === 1
        ? Math.min(ceiling, vol + step)
        : Math.max(0, vol - step);
      if (soundRef.current) soundRef.current.volume = vol;
      const done = direction === 1 ? vol >= ceiling : vol <= 0;
      if (done) {
        clearFade();
        onDone?.();
      }
    }, FADE_MS);
  }, [clearFade]);

  const decideCatalog = useCallback(async (
    songIds: readonly (string | null)[],
    loopOne: boolean,
    prompt: boolean,
  ) => {
    let status: AppleMusicAuthStatus = 'unavailable';
    try {
      status = await getAppleMusicAuthorizationStatus();
      if (prompt && appleMusicPrefRef.current && status === 'notDetermined' && isAppleMusicKitAvailable()) {
        // First match (or the settings toggle) is the permission moment. Not launch.
        status = await settleWithin(requestAppleMusicAuthorization(), AUTH_WAIT_MS, 'unavailable');
      }
    } catch {
      status = 'unavailable';
    }
    let canPlayCatalog = false;
    if (status === 'authorized') {
      try {
        canPlayCatalog = await canPlayAppleMusicCatalog();
      } catch {
        canPlayCatalog = false;
      }
    }
    return resolveCatalogPlayback({
      platform: Platform.OS,
      preferenceOn: appleMusicPrefRef.current,
      moduleAvailable: isAppleMusicKitAvailable(),
      authorized: status === 'authorized',
      canPlayCatalog,
      muted: isMutedRef.current,
      songIds,
    }, loopOne);
  }, []);

  const beginCatalog = useCallback(async (
    songIds: string[],
    loopOne: boolean,
    gen: number,
    mode: MusicMode,
  ) => {
    if (gen !== playGen.current || modeRef.current !== mode) return false;
    const ok = loopOne
      ? await playAppleMusicSong(songIds[0] ?? '', true)
      : await playAppleMusicQueue(songIds);
    if (!ok || gen !== playGen.current || modeRef.current !== mode) {
      await stopAppleMusic();
      return false;
    }
    // Drop the bundled player only after the catalog stream is actually going,
    // so a failed lookup does not leave the match silent.
    await unloadCurrent();
    if (gen !== playGen.current || modeRef.current !== mode) {
      await stopAppleMusic();
      return false;
    }
    backendRef.current = 'musickit';
    if (mountedRef.current) setIsPlaying(true);
    return true;
  }, [unloadCurrent]);

  // ─── Splash track (looping) ────────────────────────────────────────────────

  const playSplashTrackAsync = useCallback(async () => {
    if (!mountedRef.current) return;
    const gen = playGen.current;
    splashFadeOutStartedRef.current = false;

    // Lobby focus does not prompt. Catalog plays only after a match or the
    // settings toggle has already been allowed.
    try {
      const decision = await decideCatalog([SPLASH_CATALOG_ID], true, false);
      if (gen !== playGen.current || modeRef.current !== 'splash') return;
      if (decision.backend === 'musickit') {
        const started = await beginCatalog(decision.songIds, true, gen, 'splash');
        if (started || gen !== playGen.current || modeRef.current !== 'splash') return;
      }
    } catch {
      // Fall through to the bundled file.
    }

    if (!_audio) return;
    if (gen !== playGen.current || modeRef.current !== 'splash') return;
    if (backendRef.current === 'musickit') {
      backendRef.current = 'none';
      await stopAppleMusic();
    }

    await unloadCurrent();
    if (!mountedRef.current || !splashActiveRef.current || gen !== playGen.current) return;

    try {
      await _audio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });

      const player = _audio.createAudioPlayer(TRACKS[SPLASH_TRACK_IDX] as number, { updateInterval: 100 });
      player.volume = 0;

      player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
        if (!status.isLoaded) return;

        // Begin fade-out 6 s before the track ends → reaches 0 exactly at boundary.
        // expo-audio uses seconds (not ms) for currentTime and duration.
        if (
          !splashFadeOutStartedRef.current &&
          status.duration > 0 &&
          status.currentTime >= status.duration - SPLASH_FADE_MS / 1000
        ) {
          splashFadeOutStartedRef.current = true;
          startFade(-1);
        }

        // Loop: restart with fresh fade-in
        if (status.didJustFinish && splashActiveRef.current) {
          void playSplashTrackAsync();
        }
      });

      soundRef.current = player;
      backendRef.current = 'bundled';
      player.play();
      if (mountedRef.current) setIsPlaying(true);
      startFade(1, undefined, SPLASH_FADE_IN_STEPS, 1.0); // 4-second fade-in to full volume
    } catch {
      // Audio is best-effort — never crash the app
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unloadCurrent, startFade, decideCatalog, beginCatalog]);

  const playSplashTrack = useCallback(() => {
    // CRITICAL: no-op if splash is already playing. Prevents the restart bug
    // that fired on every focus change of the lobby.
    if (modeRef.current === 'splash') return;
    modeRef.current = 'splash';
    splashActiveRef.current = true;
    void playSplashTrackAsync();
  }, [playSplashTrackAsync]);

  // ─── Match music (arena track or shuffled playlist) ────────────────────────

  const playTrack = useCallback(async (trackAssetIndex: number, startVol: number) => {
    if (!_audio) return;
    if (backendRef.current === 'musickit') {
      backendRef.current = 'none';
      await stopAppleMusic();
    }
    await unloadCurrent();
    if (!mountedRef.current) return;
    try {
      await _audio.setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });

      const player = _audio.createAudioPlayer(TRACKS[trackAssetIndex] as number, { updateInterval: 500 });
      player.volume = startVol;

      if (arenaLoopIdxRef.current !== null) {
        // Arena mode — native player loop is reliable and gap-free
        player.loop = true;
      } else {
        // Shuffle queue — advance to next track on finish
        player.addListener('playbackStatusUpdate', (status: AudioStatus) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            queuePos.current++;
            if (queuePos.current >= queueRef.current.length) {
              queueRef.current = shuffleIndices(PLAYLIST_SIZE);
              queuePos.current = 0;
            }
            const next = queueRef.current[queuePos.current];
            void playTrack(next, isMutedRef.current ? 0 : volumeLevelRef.current);
          }
        });
      }

      soundRef.current = player;
      backendRef.current = 'bundled';
      player.play();
      if (mountedRef.current) setIsPlaying(true);
    } catch {
      // Audio is best-effort — never crash the game
    }
  }, [unloadCurrent]);

  const startBundledMatch = useCallback(async (arenaTrackIdx: number | undefined) => {
    if (arenaTrackIdx != null) {
      arenaLoopIdxRef.current = arenaTrackIdx;
      await playTrack(arenaTrackIdx, 0);
    } else {
      arenaLoopIdxRef.current = null;
      queueRef.current = shuffleIndices(PLAYLIST_SIZE);
      queuePos.current = 0;
      await playTrack(queueRef.current[0], 0);
    }
    startFade(1, undefined, MATCH_FADE_STEPS);
  }, [playTrack, startFade]);

  const startMusic = useCallback((arenaId?: ArenaId) => {
    // CRITICAL: no-op if match music is already playing. Guards against
    // remounts of the game screen restarting the song.
    if (modeRef.current === 'match') return;
    modeRef.current = 'match';
    splashActiveRef.current = false;
    arenaRef.current = arenaId;
    const gen = ++playGen.current;

    const arenaTrackIdx = arenaId != null ? ARENA_TRACK[arenaId] : undefined;
    const selection = catalogSelectionForArena(arenaId);

    // Await player creation before starting the fade so the fade interval
    // never runs against a null soundRef (race condition that caused silence).
    const doStart = async () => {
      try {
        // prompt: true — the first match is when Apple Music permission appears.
        const decision = await decideCatalog(selection.songIds, selection.loopOne, true);
        if (gen !== playGen.current || modeRef.current !== 'match') return;
        if (decision.backend === 'musickit') {
          const started = await beginCatalog(decision.songIds, decision.loopOne, gen, 'match');
          if (started || gen !== playGen.current || modeRef.current !== 'match') return;
        }
      } catch {
        // Catalog failed closed. The bundled track still plays.
      }
      if (gen !== playGen.current || modeRef.current !== 'match') return;
      await startBundledMatch(arenaTrackIdx);
    };
    void doStart();
  }, [decideCatalog, beginCatalog, startBundledMatch]);

  // ─── Stop (shared) ─────────────────────────────────────────────────────────

  const stopMusic = useCallback(() => {
    playGen.current += 1;
    modeRef.current = 'idle';
    splashActiveRef.current = false;
    arenaLoopIdxRef.current = null;
    const usedKit = backendRef.current === 'musickit';
    backendRef.current = 'none';
    void stopAppleMusic();

    clearFade();
    const sound = soundRef.current;
    if (usedKit || !sound) {
      if (usedKit) void unloadCurrent();
      if (mountedRef.current) setIsPlaying(false);
      return;
    }

    const ceiling = isMutedRef.current ? 0 : volumeLevelRef.current;
    if (ceiling === 0) {
      // Already silent — unload immediately without fading
      sound.pause();
      sound.remove();
      if (soundRef.current === sound) soundRef.current = null;
      if (mountedRef.current) setIsPlaying(false);
      return;
    }

    let vol: number = ceiling;
    const step = ceiling / SPLASH_FADE_STEPS;
    fadeRef.current = setInterval(() => {
      vol = Math.max(0, vol - step);
      sound.volume = vol;
      if (vol <= 0) {
        clearFade();
        sound.pause();
        sound.remove();
        if (soundRef.current === sound) soundRef.current = null;
        if (mountedRef.current) setIsPlaying(false);
      }
    }, FADE_MS);
  }, [clearFade, unloadCurrent]);

  /**
   * Fast version of stopMusic: fades out in ~1 400 ms.
   * Use this when navigating into a match so the music is silent
   * before the game screen appears.
   */
  const stopMusicFast = useCallback(() => {
    playGen.current += 1;
    modeRef.current = 'idle';
    splashActiveRef.current = false;
    arenaLoopIdxRef.current = null;
    const usedKit = backendRef.current === 'musickit';
    backendRef.current = 'none';
    void stopAppleMusic();

    clearFade();
    const sound = soundRef.current;
    if (usedKit || !sound) {
      if (usedKit) void unloadCurrent();
      if (mountedRef.current) setIsPlaying(false);
      return;
    }

    const ceiling = isMutedRef.current ? 0 : volumeLevelRef.current;
    if (ceiling === 0) {
      sound.pause();
      sound.remove();
      if (soundRef.current === sound) soundRef.current = null;
      if (mountedRef.current) setIsPlaying(false);
      return;
    }

    let vol: number = ceiling;
    const step = ceiling / FAST_STOP_STEPS;
    fadeRef.current = setInterval(() => {
      vol = Math.max(0, vol - step);
      sound.volume = vol;
      if (vol <= 0) {
        clearFade();
        sound.pause();
        sound.remove();
        if (soundRef.current === sound) soundRef.current = null;
        if (mountedRef.current) setIsPlaying(false);
      }
    }, FADE_MS);
  }, [clearFade, unloadCurrent]);

  const upgradeToCatalog = useCallback(async () => {
    const gen = playGen.current;
    const mode = modeRef.current;
    if (mode === 'idle' || isMutedRef.current || backendRef.current === 'musickit') return;
    const selection = mode === 'splash'
      ? { loopOne: true, songIds: [SPLASH_CATALOG_ID] }
      : catalogSelectionForArena(arenaRef.current);
    try {
      const decision = await decideCatalog(selection.songIds, selection.loopOne, false);
      if (decision.backend !== 'musickit') return;
      if (gen !== playGen.current || modeRef.current !== mode || isMutedRef.current) return;
      if (soundRef.current) soundRef.current.volume = 0;
      const started = await beginCatalog(decision.songIds, decision.loopOne, gen, mode);
      if (!started && soundRef.current && !isMutedRef.current) {
        soundRef.current.volume = mode === 'splash' ? 1 : volumeLevelRef.current;
      }
    } catch {
      if (soundRef.current && !isMutedRef.current) {
        soundRef.current.volume = volumeLevelRef.current;
      }
    }
  }, [decideCatalog, beginCatalog]);

  onMuteChangedRef.current = (muted, becameAudible) => {
    if (backendRef.current === 'musickit') {
      if (muted) void pauseAppleMusic();
      else void resumeAppleMusic();
      return;
    }
    if (soundRef.current) {
      soundRef.current.volume = muted ? 0 : volumeLevelRef.current;
    }
    if (becameAudible) void upgradeToCatalog();
  };

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const setVolumeLevel = useCallback((v: VolumeLevel) => {
    volumeLevelRef.current = v;
    setVolumeLevelState(v);
    AsyncStorage.setItem(VOLUME_KEY, String(v)).catch(() => {});
    if (backendRef.current === 'musickit') {
      // The application player has no gain. Mute pauses it. This records the
      // level for the bundled fallback and reports whether a gain was applied.
      void setAppleMusicVolume(v);
      return;
    }
    if (!isMutedRef.current && soundRef.current) {
      soundRef.current.volume = v;
    }
  }, []);

  const setAppleMusicEnabled = useCallback(async (enabled: boolean): Promise<AppleMusicPreference> => {
    applePrefTouchedRef.current = true;
    appleMusicPrefRef.current = enabled;
    setAppleMusicEnabledState(enabled);
    AsyncStorage.setItem(APPLE_MUSIC_KEY, enabled ? 'on' : 'off').catch(() => {});

    if (!enabled) {
      if (backendRef.current === 'musickit') {
        const mode = modeRef.current;
        const arena = arenaRef.current;
        playGen.current += 1;
        backendRef.current = 'none';
        await stopAppleMusic();
        modeRef.current = 'idle';
        if (mode === 'splash') playSplashTrack();
        else if (mode === 'match') startMusic(arena);
      }
      let status: AppleMusicAuthStatus = 'unavailable';
      try {
        status = await getAppleMusicAuthorizationStatus();
      } catch {
        status = 'unavailable';
      }
      return { status, canPlayCatalog: false };
    }

    let status: AppleMusicAuthStatus = 'unavailable';
    try {
      status = isAppleMusicKitAvailable()
        ? await settleWithin(requestAppleMusicAuthorization(), AUTH_WAIT_MS, 'unavailable')
        : 'unavailable';
    } catch {
      status = 'unavailable';
    }
    let canPlayCatalog = false;
    if (status === 'authorized') {
      try {
        canPlayCatalog = await canPlayAppleMusicCatalog();
      } catch {
        canPlayCatalog = false;
      }
    }
    if (canPlayCatalog && !isMutedRef.current) await upgradeToCatalog();
    return { status, canPlayCatalog };
  }, [playSplashTrack, startMusic, upgradeToCatalog]);

  return (
    <MusicContext.Provider value={{
      isMuted, isPlaying, volumeLevel: volumeLevelState, appleMusicEnabled,
      toggleMute, setVolumeLevel, setAppleMusicEnabled, playSplashTrack, startMusic, stopMusic, stopMusicFast,
    }}>
      {children}
    </MusicContext.Provider>
  );
}
