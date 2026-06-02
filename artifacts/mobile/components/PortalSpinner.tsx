import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface PortalSpinnerProps {
  /** Outer diameter of the portal in px. Default 220. */
  size?: number;
}

/**
 * Spinning ring with a single rotation animation. Two-color gradient achieved by
 * coloring borderTop and borderRight; the bottom/left stay transparent so the
 * ring reads as a partial arc which gives the swirl illusion.
 */
function Ring({
  size,
  thickness,
  duration,
  reverse = false,
  color,
  trail,
}: {
  size: number;
  thickness: number;
  duration: number;
  reverse?: boolean;
  color: string;
  trail: string;
}) {
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = withRepeat(
      withTiming(reverse ? -360 : 360, { duration, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: 'transparent',
          borderTopColor: color,
          borderRightColor: trail,
        },
      ]}
    />
  );
}

/** A single particle that orbits the portal at a given radius. */
function Particle({
  radius,
  size,
  color,
  duration,
  phase,
  reverse = false,
}: {
  radius: number;
  size: number;
  color: string;
  duration: number;
  phase: number;
  reverse?: boolean;
}) {
  const angle = useSharedValue(phase);
  const opacity = useSharedValue(0.4);
  useEffect(() => {
    angle.value = withRepeat(
      withTiming(phase + (reverse ? -360 : 360), { duration, easing: Easing.linear }),
      -1,
      false,
    );
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: duration / 4 }),
        withTiming(0.3, { duration: duration / 4 }),
      ),
      -1,
      true,
    );
  }, []);
  const style = useAnimatedStyle(() => {
    const rad = (angle.value * Math.PI) / 180;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: Math.cos(rad) * radius },
        { translateY: Math.sin(rad) * radius },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 8,
          elevation: 8,
        },
      ]}
    />
  );
}

/**
 * Animated neon "portal" — concentric swirling rings, orbiting particles, and a
 * pulsing core. Drop-in replacement for a generic spinner; gives the matchmaking
 * and room-waiting screens a cinematic on-theme loading state.
 */
export function PortalSpinner({ size = 220 }: PortalSpinnerProps): React.JSX.Element {
  // Pulsing core scale + glow.
  const corePulse = useSharedValue(0);
  useEffect(() => {
    corePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, []);
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(corePulse.value, [0, 1], [0.85, 1.15]) }],
    opacity: interpolate(corePulse.value, [0, 1], [0.7, 1]),
  }));

  // Outward expanding "shockwave" ring that fades as it grows.
  const wave = useSharedValue(0);
  useEffect(() => {
    wave.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, []);
  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(wave.value, [0, 1], [0.4, 1.05]) }],
    opacity: interpolate(wave.value, [0, 0.2, 1], [0, 0.6, 0]),
  }));

  const coreSize = Math.round(size * 0.18);
  // Pre-place 8 particles at staggered angles around two orbits.
  const particles = [
    { r: size * 0.32, sz: 6, color: '#fbbf24', dur: 4500, phase: 0 },
    { r: size * 0.32, sz: 5, color: '#fbbf24', dur: 4500, phase: 120 },
    { r: size * 0.32, sz: 5, color: '#fbbf24', dur: 4500, phase: 240 },
    { r: size * 0.42, sz: 4, color: '#a855f7', dur: 6000, phase: 60, reverse: true },
    { r: size * 0.42, sz: 4, color: '#a855f7', dur: 6000, phase: 180, reverse: true },
    { r: size * 0.42, sz: 4, color: '#a855f7', dur: 6000, phase: 300, reverse: true },
    { r: size * 0.22, sz: 3, color: '#06b6d4', dur: 2800, phase: 45 },
    { r: size * 0.22, sz: 3, color: '#06b6d4', dur: 2800, phase: 225 },
  ];

  return (
    <View style={[styles.container, { width: size, height: size }]} pointerEvents="none">
      {/* Outermost slow ring — gold trail */}
      <Ring size={size} thickness={2} duration={6000} color="#fbbf24" trail="rgba(251,191,36,0.2)" />
      {/* Mid ring — purple, reverse */}
      <Ring size={size * 0.78} thickness={2.5} duration={4200} reverse color="#a855f7" trail="rgba(168,85,247,0.25)" />
      {/* Inner ring — electric, fast */}
      <Ring size={size * 0.56} thickness={2} duration={2400} color="#06b6d4" trail="rgba(6,182,212,0.3)" />
      {/* Innermost — gold again, very fast reverse */}
      <Ring size={size * 0.38} thickness={1.5} duration={1600} reverse color="#fbbf24" trail="rgba(251,191,36,0.4)" />

      {/* Expanding shockwave from the center */}
      <Animated.View
        style={[
          waveStyle,
          {
            position: 'absolute',
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: (size * 0.9) / 2,
            borderWidth: 1.5,
            borderColor: '#a855f7',
          },
        ]}
        pointerEvents="none"
      />

      {/* Orbiting particles */}
      {particles.map((p, i) => (
        <Particle key={i} radius={p.r} size={p.sz} color={p.color} duration={p.dur} phase={p.phase} reverse={p.reverse} />
      ))}

      {/* Glowing core */}
      <Animated.View
        style={[
          coreStyle,
          {
            width: coreSize,
            height: coreSize,
            borderRadius: coreSize / 2,
            shadowColor: '#a855f7',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 20,
          },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['#fbbf24', '#a855f7', '#3b1d6e']}
          style={{ flex: 1, borderRadius: coreSize / 2 }}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});
