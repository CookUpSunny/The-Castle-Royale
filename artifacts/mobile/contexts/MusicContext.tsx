/**
 * MusicContext — background music player
 *
 * Two modes:
 *  • Splash  — "Sparks Fly" loops on the lobby screen (6 s fade-in, 6 s
 *              fade-out before each loop boundary, seamless restart).
 *  • Match   — shuffled playlist of all 4 tracks, 6 s fade-in per track.
 *
 * ─── TRACKS ──────────────────────────────────────────────────────────────────
 *   track1.wav — Low Energy 2nd Wind
 *   track2.wav — Sparks Fly  ← splash screen track
 *   track3.wav — Wife Changing Money
 *   track4.wav — Go! Go! Go!
 *
 * To swap a track: replace the .wav file and keep the same filename.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { setSfxMuted } from '../lib/sfx';

const MUTED_KEY = '@castleroyale_music_muted';
const FADE_STEPS        = 60;
const FADE_MS           = 100;  // 60 × 100 ms = 6 000 ms per fade
const FADE_DURATION_MS  = FADE_STEPS * FADE_MS; // 6 000 ms
const SPLASH_TRACK_IDX  = 1;    // track2.wav — Sparks Fly

// eslint-disable-next-line @typescript-eslint/no-require-imports
const TRACKS: number[] = [
  require('../assets/music/track1.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track2.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track3.wav') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('../assets/music/track4.wav') as number,
];

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
  toggleMute: () => void;
  /** Start the looping splash-screen track (Sparks Fly). No-op if splash is already playing. */
  playSplashTrack: () => void;
  /** Start the shuffled in-match playlist. No-op if match playlist is already playing. */
  startMusic: () => void;
  stopMusic: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  isMuted: false,
  isPlaying: false,
  toggleMute: () => {},
  playSplashTrack: () => {},
  startMusic: () => {},
  stopMusic: () => {},
});

export function useMusicPlayer() {
  return useContext(MusicContext);
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const isMutedRef    = useRef(false);
  const soundRef      = useRef<Audio.Sound | null>(null);
  const fadeRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef    = useRef(true);
  const prefLoadedRef = useRef(false);

  // Current playback mode — guards against duplicate start calls that would
  // restart the song (the bug that made the song restart on every card tap).
  const modeRef = useRef<MusicMode>('idle');

  // Splash-mode flags
  const splashActiveRef        = useRef(false);
  const splashFadeOutStartedRef = useRef(false);

  // Match-mode shuffle queue
  const queueRef = useRef<number[]>(shuffleIndices(TRACKS.length));
  const queuePos = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(MUTED_KEY).then((val) => {
      if (!mountedRef.current) return;
      prefLoadedRef.current = true;
      if (val === 'true') {
        isMutedRef.current = true;
        setSfxMuted(true);
        setIsMuted(true);
      }
    });
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    isMutedRef.current = isMuted;
    // Keep SFX module in sync — one toggle silences both music and sound effects.
    setSfxMuted(isMuted);
    if (prefLoadedRef.current) {
      AsyncStorage.setItem(MUTED_KEY, isMuted ? 'true' : 'false');
    }
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(isMuted ? 0 : 1).catch(() => {});
    }
  }, [isMuted]);

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

  /** Run a volume ramp. direction: +1 = fade in, -1 = fade out. */
  const startFade = useCallback((direction: 1 | -1, onDone?: () => void) => {
    clearFade();
    if (isMutedRef.current) {
      onDone?.();
      return;
    }
    let vol = direction === 1 ? 0 : 1;
    const step = 1 / FADE_STEPS;
    fadeRef.current = setInterval(() => {
      vol = direction === 1
        ? Math.min(1, vol + step)
        : Math.max(0, vol - step);
      soundRef.current?.setVolumeAsync(vol).catch(() => {});
      const done = direction === 1 ? vol >= 1 : vol <= 0;
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

          // Begin fade-out 6 s before the track ends so it reaches 0 exactly
          // at the boundary, then the loop restarts with a fresh fade-in.
          if (
            !splashFadeOutStartedRef.current &&
            status.durationMillis != null &&
            status.positionMillis >= status.durationMillis - FADE_DURATION_MS
          ) {
            splashFadeOutStartedRef.current = true;
            startFade(-1);
          }

          // Loop: restart with fade-in
          if (status.didJustFinish && splashActiveRef.current) {
            void playSplashTrackAsync();
          }
        },
      );

      soundRef.current = sound;
      if (mountedRef.current) setIsPlaying(true);

      // 6-second fade-in from silence
      startFade(1);
    } catch {
      // Audio is best-effort — never crash the app
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unloadCurrent, startFade]);

  const playSplashTrack = useCallback(() => {
    // CRITICAL: no-op if splash is already playing. Prevents the song restart
    // bug that fired on every focus change of the lobby.
    if (modeRef.current === 'splash') return;
    modeRef.current = 'splash';
    splashActiveRef.current = true;
    void playSplashTrackAsync();
  }, [playSplashTrackAsync]);

  // ─── Match playlist ────────────────────────────────────────────────────────

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
            queuePos.current++;
            if (queuePos.current >= queueRef.current.length) {
              queueRef.current = shuffleIndices(TRACKS.length);
              queuePos.current = 0;
            }
            const next = queueRef.current[queuePos.current];
            void playTrack(next, isMutedRef.current ? 0 : 1);
          }
        },
      );
      soundRef.current = sound;
      if (mountedRef.current) setIsPlaying(true);
    } catch {
      // Audio is best-effort — never crash the game
    }
  }, [unloadCurrent]);

  const startMusic = useCallback(() => {
    // CRITICAL: no-op if match playlist is already playing. This guards against
    // remounts of the game screen (every card tap during setup used to remount
    // /game and restart the song).
    if (modeRef.current === 'match') return;
    modeRef.current = 'match';
    splashActiveRef.current = false;

    // Fresh shuffle every match
    queueRef.current = shuffleIndices(TRACKS.length);
    queuePos.current = 0;

    void playTrack(queueRef.current[0], 0);

    // 6-second fade-in
    startFade(1);
  }, [playTrack, startFade]);

  // ─── Stop (shared) ─────────────────────────────────────────────────────────

  const stopMusic = useCallback(() => {
    modeRef.current = 'idle';
    splashActiveRef.current = false;

    clearFade();
    const sound = soundRef.current;
    if (!sound) {
      if (mountedRef.current) setIsPlaying(false);
      return;
    }

    let vol = isMutedRef.current ? 0 : 1;
    const step = 1 / FADE_STEPS;
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

  return (
    <MusicContext.Provider value={{ isMuted, isPlaying, toggleMute, playSplashTrack, startMusic, stopMusic }}>
      {children}
    </MusicContext.Provider>
  );
}
