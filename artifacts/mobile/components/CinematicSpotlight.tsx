import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import type { LayoutRect } from '@/components/CardPlayFlight';

export type SpotlightStrength = 'off' | 'soft';

function centerOf(r: LayoutRect | null): { x: number; y: number } | null {
  if (!r || r.width <= 0 || r.height <= 0) return null;
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

export default function CinematicSpotlight({
  targetRect,
  strength,
  trigger,
}: {
  targetRect: LayoutRect | null;
  strength: SpotlightStrength;
  trigger: number;
}) {
  const dim = useSharedValue(0);
  const spot = useSharedValue(0);
  const c = centerOf(targetRect);

  useEffect(() => {
    const dimTo = strength === 'off' ? 0 : 0.35;
    const spotTo = strength === 'off' ? 0 : 1;

    // A short “snap in”, then a slightly longer release.
    dim.value = withTiming(dimTo, { duration: 140, easing: Easing.out(Easing.cubic) });
    spot.value = withTiming(spotTo, { duration: 180, easing: Easing.out(Easing.cubic) });
    return () => {
      dim.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) });
      spot.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));
  const spotStyle = useAnimatedStyle(() => ({ opacity: spot.value }));

  if (strength === 'off') return null;

  // Spotlight is “good enough” without a true radial gradient: we combine a
  // full-screen dim + a bright soft disc around the target.
  const discSize = 260;
  const left = (c?.x ?? 0) - discSize / 2;
  const top = (c?.y ?? 0) - discSize / 2;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, dimStyle]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.65)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.70)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.discWrap,
          spotStyle,
          { width: discSize, height: discSize, borderRadius: discSize / 2, left, top },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,220,140,0.00)', 'rgba(255,220,140,0.22)', 'rgba(255,220,140,0.00)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  discWrap: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
