import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { INTRO_FALLBACK_MS } from '@/lib/launchIntro';

const INTRO = require('../assets/video/intro.mp4');

/**
 * Full-screen silent intro. The parent keeps the native splash up until
 * `onFirstFrame`, then this view covers the screen on white.
 */
export function LaunchIntro({
  onFirstFrame,
  onFinish,
}: {
  onFirstFrame: () => void;
  onFinish: () => void;
}) {
  const finished = useRef(false);
  const onFirstFrameRef = useRef(onFirstFrame);
  const onFinishRef = useRef(onFinish);
  onFirstFrameRef.current = onFirstFrame;
  onFinishRef.current = onFinish;

  const player = useVideoPlayer(INTRO, (created) => {
    created.muted = true;
    created.volume = 0;
    created.loop = false;
    created.audioMixingMode = 'mixWithOthers';
    created.play();
  });

  useEffect(() => {
    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      onFinishRef.current();
    };
    const status = player.addListener('statusChange', ({ status: next }) => {
      if (next === 'readyToPlay') onFirstFrameRef.current();
      if (next === 'error') finish();
    });
    const end = player.addListener('playToEnd', () => finish());
    const timer = setTimeout(finish, INTRO_FALLBACK_MS);
    return () => {
      status.remove();
      end.remove();
      clearTimeout(timer);
    };
  }, [player]);

  return (
    <Pressable
      onPress={() => {
        if (finished.current) return;
        finished.current = true;
        onFinishRef.current();
      }}
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
      style={styles.stage}
    >
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="cover"
        style={styles.video}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    zIndex: 80,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
  },
});
