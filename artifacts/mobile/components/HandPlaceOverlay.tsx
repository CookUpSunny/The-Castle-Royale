import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import type { LayoutRect } from '@/components/CardPlayFlight';

function centerOf(r: LayoutRect | null): { x: number; y: number } | null {
  if (!r || r.width <= 0 || r.height <= 0) return null;
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/**
 * A lightweight “hand placing a card” overlay. This is intentionally pure
 * vector-ish RN views (no binary assets) so it works bundled/offline today.
 * You can swap the inner hand silhouette for a PNG/sprite sheet later.
 */
export default function HandPlaceOverlay({
  targetRect,
  enabled,
  trigger,
}: {
  targetRect: LayoutRect | null;
  enabled: boolean;
  trigger: number;
}) {
  const c = centerOf(targetRect);
  const opacity = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const rot = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!enabled || !c) return;

    // Start “off camera” and swoop in.
    opacity.value = 0;
    tx.value = c.x + 120;
    ty.value = c.y + 220;
    rot.value = 18;
    scale.value = 0.95;

    opacity.value = withTiming(1, { duration: 80 });
    tx.value = withTiming(c.x + 28, { duration: 240, easing: Easing.out(Easing.cubic) });
    ty.value = withTiming(c.y + 36, { duration: 240, easing: Easing.out(Easing.cubic) });
    rot.value = withTiming(-10, { duration: 260, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1.04, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withTiming(1.0, { duration: 160, easing: Easing.inOut(Easing.cubic) }),
    );

    // Press + release micro-motion, then fade out.
    ty.value = withSequence(
      withDelay(220, withTiming(c.y + 48, { duration: 120, easing: Easing.out(Easing.cubic) })),
      withTiming(c.y + 30, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withDelay(220, withTiming(c.y + 210, { duration: 260, easing: Easing.in(Easing.cubic) })),
    );
    opacity.value = withDelay(720, withTiming(0, { duration: 160 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value - HAND_W / 2 },
      { translateY: ty.value - HAND_H / 2 },
      { rotate: `${rot.value}deg` },
      { scale: scale.value },
    ],
  }));

  if (!enabled || !c) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.wrap, style]}>
        <View style={styles.palm} />
        <View style={[styles.finger, styles.finger1]} />
        <View style={[styles.finger, styles.finger2]} />
        <View style={[styles.finger, styles.finger3]} />
        <View style={[styles.thumb, styles.thumbShadow]} />
        <View style={styles.thumb} />
      </Animated.View>
    </View>
  );
}

const HAND_W = 140;
const HAND_H = 140;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    width: HAND_W,
    height: HAND_H,
    zIndex: 140,
    elevation: 40,
  },
  palm: {
    position: 'absolute',
    left: 32,
    top: 56,
    width: 78,
    height: 62,
    borderRadius: 28,
    backgroundColor: '#f2d0b5',
    borderWidth: 1,
    borderColor: '#e3b89c',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  finger: {
    position: 'absolute',
    width: 20,
    height: 58,
    borderRadius: 12,
    backgroundColor: '#f2d0b5',
    borderWidth: 1,
    borderColor: '#e3b89c',
  },
  finger1: { left: 46, top: 18, transform: [{ rotate: '6deg' }] },
  finger2: { left: 66, top: 14, transform: [{ rotate: '2deg' }] },
  finger3: { left: 86, top: 20, transform: [{ rotate: '-6deg' }] },
  thumb: {
    position: 'absolute',
    left: 18,
    top: 68,
    width: 44,
    height: 28,
    borderRadius: 18,
    backgroundColor: '#f2d0b5',
    borderWidth: 1,
    borderColor: '#e3b89c',
    transform: [{ rotate: '28deg' }],
  },
  thumbShadow: {
    backgroundColor: '#000',
    opacity: 0.08,
    borderColor: 'transparent',
    top: 72,
    left: 16,
  },
});
