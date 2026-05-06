/**
 * MusicContext — in-match background music player
 *
 * Playlist: shuffled on every match start, re-shuffles after all 4 tracks play.
 *
 * ─── TRACKS ──────────────────────────────────────────────────────────────────
 *   track1.wav — Low Energy 2nd Wind
 *   track2.wav — Sparks Fly
 *   track3.wav — Wife Changing Money
 *   track4.wav — Go! Go! Go!
 *
 * To swap a track: replace the .wav file and keep the same filename.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const MUTED_KEY = '@castleroyale_music_muted';
const FADE_STEPS = 60;
const FADE_MS    = 100; // 60 × 100ms = 6 000ms fade-in

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

interface MusicContextValue {
  isMuted: boolean;
  isPlaying: boolean;
  toggleMute: () => void;
  startMusic: () => void;
  stopMusic: () => void;
}

const MusicContext = createContext<MusicContextValue>({
  isMuted: false,
  isPlaying: false,
  toggleMute: () => {},
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

  // Shuffle queue — rebuilt at each startMusic() call and when exhausted
  const queueRef = useRef<number[]>(shuffleIndices(TRACKS.length));
  const queuePos = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(MUTED_KEY).then((val) => {
      if (!mountedRef.current) return;
      prefLoadedRef.current = true;
      if (val === 'true') {
        isMutedRef.current = true;
        setIsMuted(true);
      }
    });
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (prefLoadedRef.current) {
      AsyncStorage.setItem(MUTED_KEY, isMuted ? 'true' : 'false');
    }
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(isMuted ? 0 : 1).catch(() => {});
    }
  }, [isMuted]);

  const clearFade = () => {
    if (fadeRef.current !== null) {
      clearInterval(fadeRef.current);
      fadeRef.current = null;
    }
  };

  const unloadCurrent = useCallback(async () => {
    if (soundRef.current) {
      const s = soundRef.current;
      soundRef.current = null;
      try { await s.stopAsync(); } catch {}
      try { await s.unloadAsync(); } catch {}
    }
  }, []);

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
            playTrack(next, isMutedRef.current ? 0 : 1);
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
    // Fresh shuffle every match
    queueRef.current = shuffleIndices(TRACKS.length);
    queuePos.current = 0;

    clearFade();
    void playTrack(queueRef.current[0], 0);

    // 6-second fade in
    if (!isMutedRef.current) {
      let vol = 0;
      const step = 1 / FADE_STEPS;
      fadeRef.current = setInterval(() => {
        vol = Math.min(1, vol + step);
        soundRef.current?.setVolumeAsync(vol).catch(() => {});
        if (vol >= 1) clearFade();
      }, FADE_MS);
    }
  }, [playTrack]);

  const stopMusic = useCallback(() => {
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
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((m) => !m);
  }, []);

  return (
    <MusicContext.Provider value={{ isMuted, isPlaying, toggleMute, startMusic, stopMusic }}>
      {children}
    </MusicContext.Provider>
  );
}
