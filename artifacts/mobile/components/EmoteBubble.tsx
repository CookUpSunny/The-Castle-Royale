import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface EmoteBubbleProps {
  emote: string;
  /** 'left' = local player (bottom-left), 'right' = opponent (bottom-right). */
  side: 'left' | 'right';
}

/**
 * Zoom-style floating reaction — emoji or phrase pops in near the bottom of
 * the screen and drifts upward over ~3 seconds, fading out as it reaches the
 * top third.
 *
 * This component is intentionally "fire and forget": it animates from mount
 * to unmount and exposes no completion callback. The parent owns the bubble
 * lifetime via its own setTimeout so we never round-trip a finished-callback
 * back into parent setState, which previously could re-trigger the bubble on
 * subsequent card plays.
 */
export default function EmoteBubble({ emote, side }: EmoteBubbleProps) {
  const { height } = useWindowDimensions();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.4);

  const isEmoji = /\p{Extended_Pictographic}/u.test(emote) && emote.length <= 4;

  // Slight random horizontal drift toward centre so repeated emotes don't
  // perfectly stack. Stable for the lifetime of this instance via useMemo.
  const lateralDrift = useMemo(() => (Math.random() - 0.5) * 28, []);

  const translateX = useSharedValue(0);

  // Latest height held in a ref so the animation effect never depends on it.
  // useWindowDimensions() can fluctuate mid-game (status bar / keyboard /
  // visual viewport on web), and a 1px height jiggle must NOT restart the
  // float animation.
  const heightRef = useRef(height);
  heightRef.current = height;

  useEffect(() => {
    // Pop in with an overshoot
    scale.value = withSequence(
      withTiming(1.25, { duration: 220, easing: Easing.out(Easing.back(2.2)) }),
      withTiming(1.0, { duration: 180 }),
    );

    // Opacity: fade in fast, hold, then fade out in the final second
    opacity.value = withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(1700, withTiming(0, { duration: 1100 })),
    );

    // Float up ~70% of the screen height
    translateY.value = withTiming(-(heightRef.current * 0.68), {
      duration: 2900,
      easing: Easing.out(Easing.quad),
    });

    // Drift slightly toward centre
    translateX.value = withTiming(lateralDrift, {
      duration: 2900,
      easing: Easing.inOut(Easing.quad),
    });

    return () => {
      // Stop any in-flight animations on unmount so their finished-callbacks
      // don't fire after we've gone away.
      cancelAnimation(scale);
      cancelAnimation(opacity);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
    };
    // Empty deps so the animation runs once per mount. The parent assigns a
    // unique React key per emote, so every new emote already remounts this
    // component fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        side === 'left' ? styles.wrapLeft : styles.wrapRight,
        style,
      ]}
    >
      <View style={styles.pill}>
        <Text style={isEmoji ? styles.emojiLarge : styles.labelText}>{emote}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 96,
    zIndex: 200,
    alignItems: 'center',
  },
  wrapLeft: {
    left: 28,
  },
  wrapRight: {
    right: 28,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 28,
    backgroundColor: '#1a0535dd',
    borderWidth: 1.5,
    borderColor: '#fbbf2480',
    shadowColor: '#fbbf24',
    shadowOpacity: 0.55,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiLarge: {
    fontSize: 38,
    lineHeight: 44,
  },
  labelText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#fbbf24',
  },
});
