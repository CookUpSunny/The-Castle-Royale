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
 *   track1.wav   — Low Energy 2nd Wind  ← greenTable arena ("Casino Green")
 *   track2.wav   — Sparks Fly           ← splash screen track
 *   track3.wav   — Wife Changing Money  ┐ shuffled playlist for arenas
 *   track4.wav   — Go! Go! Go!          ┘ without a dedicated track
 *   oasis.wav    — Underground Kingdom  ← lightning arena  ("An Oasis in the Cave")
 *   flamingo.wav — Go! Go! Go!          ← classic arena   ("The Flamingo Floor")
 *   olympus.wav  — Winning Man Anthem   ← royal arena     ("Olympus Throne")
 *   cosmic.wav   — [replace with track] ← cosmic arena    ("Cosmic Sanctum")
 *
 * To add a new arena track: copy the .wav into assets/music/, require() it in
 * TRACKS below, and add one line to ARENA_TRACK mapping the ArenaId → index.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ArenaId } from './CosmeticsContext';
import { setSfxMuted } from '../lib/sfx';

const MUTED_KEY           = '@castleroyale_music_muted';
const VOLUME_KEY          = '@castleroyale_volume';
const SPLASH_FADE_STEPS   = 60;   // 60 × 100 ms = 6 000 ms (loop fade-out + stop fade-out)
const SPLASH_FADE_IN_STEPS = 40;  // 40 × 100 ms = 4 000 ms (opening fade-in only)
const MATCH_FADE_STEPS    = 30;   // 30 × 100 ms = 3 000 ms
const FADE_MS             = 100;
const SPLASH_FADE_MS    = SPLASH_FADE_STEPS * FADE_MS; // 6 000 ms — fade-out trigger point
const SPLASH_TRACK_IDX  = 1;    // track2.wav — Sparks Fly
const OASIS_TRACK_IDX    = 4;    // oasis.wav    — Underground Kingdom
const FLAMINGO_TRACK_IDX = 5;    // flamingo.wav — Go! Go! Go!
const OLYMPUS_TRACK_IDX  = 6;    // olympus.wav  — Winning Man Anthem

const CASINO_TRACK_IDX  = 0;    // track1.wav — Low Energy 2nd Wind
const COSMIC_TRACK_IDX  = 7;    // cosmic.wav  — [replace placeholder with real track]

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
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TRACKS: number[] = [
  require('../assets/music/track1.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track2.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track3.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track4.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/oasis.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/flamingo.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/olympus.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/cosmic.wav') as number,   // index 7 — replace file with real track
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

interface MusicContextValue {
  isMuted: boolean;
  isPlaying: boolean;
  volumeLevel: VolumeLevel;
  toggleMute: () => void;
  setVolumeLevel: (v: VolumeLevel) => void;
  /** Start the looping splash-screen track (Sparks Fly). No-op if already playing. */
  playSplashTrack: () => void;
  /**
   * Start in-match music. When arenaId has a dedicated track it loops that
   * single track (3 s fade-in); otherwise falls back to the shuffled playlist.
   * No-op if match music is already playing.
   */
  startMusic: (arenaId?: ArenaId) => void;
  stopMusic: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  isMuted: false,
  isPlaying: false,
  volumeLevel: DEFAULT_VOLUME,
  toggleMute: () => {},
  setVolumeLevel: () => {},
  playSplashTrack: () => {},
  startMusic: () => {},
  stopMusic: () => {},
});

export function useMusicPlayer() {
  return useContext(MusicContext);
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted]                   = useState(false);
  const [isPlaying, setIsPlaying]               = useState(false);
  const [volumeLevelState, setVolumeLevelState] = useState<VolumeLevel>(DEFAULT_VOLUME);

  const isMutedRef     = useRef(false);
  const volumeLevelRef = useRef<VolumeLevel>(DEFAULT_VOLUME);
  const soundRef       = useRef<Audio.Sound | null>(null);
  const fadeRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef     = useRef(true);
  const prefLoadedRef  = useRef(false);

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
    ]).then(([mutedVal, volumeVal]) => {
      if (!mountedRef.current) return;
      prefLoadedRef.current = true;
      if (mutedVal === 'true') {
        isMutedRef.current = true;
        setSfxMuted(true);
        setIsMuted(true);
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
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(isMuted ? 0 : volumeLevelRef.current).catch(() => {});
    }
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
      try { await s.stopAsync(); } catch {}
      try { await s.unloadAsync(); } catch {}
    }
  }, [clearFade]);

  /**
   * Volume ramp.
   *   direction +1  →  fade in  (0 → volumeLevel ceiling)
   *   direction -1  →  fade out (volumeLevel ceiling → 0)
   *   steps controls duration: default 60 (6 s); pass MATCH_FADE_STEPS for 3 s.
   */
  const startFade = useCallback((direction: 1 | -1, onDone?: () => void, steps = SPLASH_FADE_STEPS) => {
    clearFade();
    if (isMutedRef.current) {
      onDone?.();
      return;
    }
    const ceiling = volumeLevelRef.current;
    let vol       = direction === 1 ? 0 : ceiling;
    const step    = ceiling / steps;
    fadeRef.current = setInterval(() => {
      vol = direction === 1
        ? Math.min(ceiling, vol + step)
        : Math.max(0, vol - step);
      soundRef.current?.setVolumeAsync(vol).catch(() => {});
      const done = direction === 1 ? vol >= ceiling : vol <= 0;
      if (done) {
        clearFade();
        onDone?.();
      }
    }, FADE_MS);
  }, [clearFade]);

  // ─── Splash track (looping) ────────────────────────────────────────────────

  const playSplashTrackAsync = useCallback(async () => {
    if (!mountedRef.current) return;
    splashFadeOutStartedRef.current = false;

    await unloadCurrent();
    if (!mountedRef.current || !splashActiveRef.current) return;

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });

      const { sound } = await Audio.Sound.createAsync(
        TRACKS[SPLASH_TRACK_IDX] as number,
        { volume: 0, shouldPlay: true },
        (status) => {
          if (!('isLoaded' in status) || !status.isLoaded) return;

          // Begin fade-out 6 s before the track ends → reaches 0 exactly at boundary
          if (
            !splashFadeOutStartedRef.current &&
            status.durationMillis != null &&
            status.positionMillis >= status.durationMillis - SPLASH_FADE_MS
          ) {
            splashFadeOutStartedRef.current = true;
            startFade(-1);
          }

          // Loop: restart with fresh fade-in
          if (status.didJustFinish && splashActiveRef.current) {
            void playSplashTrackAsync();
          }
        },
      );

      soundRef.current = sound;
      if (mountedRef.current) setIsPlaying(true);
      startFade(1, undefined, SPLASH_FADE_IN_STEPS); // 4-second opening fade-in
    } catch {
      // Audio is best-effort — never crash the app
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unloadCurrent, startFade]);

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
    await unloadCurrent();
    if (!mountedRef.current) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(
        TRACKS[trackAssetIndex] as number,
        { volume: startVol, shouldPlay: true },
        (status) => {
          if (!('isLoaded' in status) || !status.isLoaded) return;
          if (status.didJustFinish) {
            if (arenaLoopIdxRef.current !== null) {
              // Arena mode — seamlessly loop the same track
              void playTrack(arenaLoopIdxRef.current, isMutedRef.current ? 0 : volumeLevelRef.current);
            } else {
              // Shuffle queue — advance to next track
              queuePos.current++;
              if (queuePos.current >= queueRef.current.length) {
                queueRef.current = shuffleIndices(PLAYLIST_SIZE);
                queuePos.current = 0;
              }
              const next = queueRef.current[queuePos.current];
              void playTrack(next, isMutedRef.current ? 0 : volumeLevelRef.current);
            }
          }
        },
      );
      soundRef.current = sound;
      if (mountedRef.current) setIsPlaying(true);
    } catch {
      // Audio is best-effort — never crash the game
    }
  }, [unloadCurrent]);

  const startMusic = useCallback((arenaId?: ArenaId) => {
    // CRITICAL: no-op if match music is already playing. Guards against
    // remounts of the game screen restarting the song.
    if (modeRef.current === 'match') return;
    modeRef.current = 'match';
    splashActiveRef.current = false;

    const arenaTrackIdx = arenaId != null ? ARENA_TRACK[arenaId] : undefined;

    if (arenaTrackIdx != null) {
      // Arena-specific single-track loop
      arenaLoopIdxRef.current = arenaTrackIdx;
      void playTrack(arenaTrackIdx, 0);
    } else {
      // Generic shuffled playlist
      arenaLoopIdxRef.current = null;
      queueRef.current = shuffleIndices(PLAYLIST_SIZE);
      queuePos.current = 0;
      void playTrack(queueRef.current[0], 0);
    }

    // 3-second match fade-in
    startFade(1, undefined, MATCH_FADE_STEPS);
  }, [playTrack, startFade]);

  // ─── Stop (shared) ─────────────────────────────────────────────────────────

  const stopMusic = useCallback(() => {
    modeRef.current = 'idle';
    splashActiveRef.current = false;
    arenaLoopIdxRef.current = null;

    clearFade();
    const sound = soundRef.current;
    if (!sound) {
      if (mountedRef.current) setIsPlaying(false);
      return;
    }

    const ceiling = isMutedRef.current ? 0 : volumeLevelRef.current;
    if (ceiling === 0) {
      // Already silent — unload immediately without fading
      sound.stopAsync().catch(() => {}).finally(() => {
        sound.unloadAsync().catch(() => {});
        if (soundRef.current === sound) soundRef.current = null;
        if (mountedRef.current) setIsPlaying(false);
      });
      return;
    }

    let vol: number = ceiling;
    const step = ceiling / SPLASH_FADE_STEPS;
    fadeRef.current = setInterval(() => {
      vol = Math.max(0, vol - step);
      sound.setVolumeAsync(vol).catch(() => {});
      if (vol <= 0) {
        clearFade();
        sound.stopAsync().catch(() => {}).finally(() => {
          sound.unloadAsync().catch(() => {});
          if (soundRef.current === sound) soundRef.current = null;
          if (mountedRef.current) setIsPlaying(false);
        });
      }
    }, FADE_MS);
  }, [clearFade]);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  const setVolumeLevel = useCallback((v: VolumeLevel) => {
    volumeLevelRef.current = v;
    setVolumeLevelState(v);
    AsyncStorage.setItem(VOLUME_KEY, String(v)).catch(() => {});
    if (!isMutedRef.current && soundRef.current) {
      soundRef.current.setVolumeAsync(v).catch(() => {});
    }
  }, []);

  return (
    <MusicContext.Provider value={{
      isMuted, isPlaying, volumeLevel: volumeLevelState,
      toggleMute, setVolumeLevel, playSplashTrack, startMusic, stopMusic,
    }}>
      {children}
    </MusicContext.Provider>
  );
}
