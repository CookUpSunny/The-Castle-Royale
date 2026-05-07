import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCosmetics } from '@/contexts/CosmeticsContext';
import type { ArenaId } from '@/contexts/CosmeticsContext';

interface ArenaBackgroundProps {
  arenaOverride?: ArenaId;
}

/**
 * Renders the table arena background according to the player's selected
 * cosmetic. Each arena is a self-contained absolute-fill view, layered
 * behind the table felt and the rest of the UI.
 *
 * - **classic**: purple radial-ish gradient.
 * - **cosmic**: deep-space gradient + twinkling stars + nebula glow.
 * - **royal**: warm gold-on-burgundy gradient with a subtle vignette.
 * - **lightning**: storm sky with drifting clouds, zigzag bolts, and a
 *   screen flash on every strike.
 */
export default function ArenaBackground({ arenaOverride }: ArenaBackgroundProps) {
  const { arena } = useCosmetics();
  const which = arenaOverride ?? arena;

  if (which === 'cosmic')    return <CosmicArena />;
  if (which === 'royal')     return <RoyalArena />;
  if (which === 'lightning') return <LightningArena />;
  return <ClassicArena />;
}

// ---------------------------------------------------------------------------
// Classic
// ---------------------------------------------------------------------------

function ClassicArena() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#1a0020', '#4a0040', '#1a000a']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,20,160,0.22)', 'transparent', 'rgba(255,80,180,0.18)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Royal
// ---------------------------------------------------------------------------

function RoyalArena() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#c8b8e0', '#f5f0e8', '#e8dfc0']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,240,180,0.55)', 'transparent', 'rgba(251,191,36,0.30)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cosmic
// ---------------------------------------------------------------------------

function CosmicArena() {
  const stars = useMemo(() => {
    const arr: { left: string; top: string; size: number; delay: number; bright: number }[] = [];
    for (let i = 0; i < 36; i++) {
      arr.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 1 + Math.random() * 2.6,
        delay: Math.floor(Math.random() * 2400),
        bright: 0.45 + Math.random() * 0.55,
      });
    }
    return arr;
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#02000a', '#0a0224', '#020010']}
        style={StyleSheet.absoluteFill}
      />
      <NebulaGlow />
      {stars.map((s, i) => (
        <TwinkleStar
          key={i}
          left={s.left}
          top={s.top}
          size={s.size}
          delay={s.delay}
          maxBright={s.bright}
        />
      ))}
    </View>
  );
}

function NebulaGlow() {
  const opacity = useSharedValue(0.35);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.3, { duration: 4000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(opacity);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(120,80,255,0.35)', 'rgba(60,30,160,0.18)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255,80,200,0.18)', 'transparent', 'rgba(80,200,255,0.18)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

interface TwinkleStarProps {
  left: string;
  top: string;
  size: number;
  delay: number;
  maxBright: number;
}

function TwinkleStar({ left, top, size, delay, maxBright }: TwinkleStarProps) {
  const opacity = useSharedValue(0.2);
  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(maxBright, { duration: 900 + Math.floor(Math.random() * 600), easing: Easing.inOut(Easing.quad) }),
          withTiming(0.15, { duration: 900 + Math.floor(Math.random() * 600), easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(opacity);
  }, [opacity, delay, maxBright]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: left as unknown as number,
          top: top as unknown as number,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#ffffff',
          shadowColor: '#a78bfa',
          shadowOpacity: 0.9,
          shadowRadius: size * 2,
          shadowOffset: { width: 0, height: 0 },
          elevation: 4,
        },
        style,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Lightning Storm
// ---------------------------------------------------------------------------

/**
 * Storm arena — three layers:
 *   1. Deep indigo sky gradient base
 *   2. 3 large cloud blobs drifting left↔right with slow opacity glow pulses
 *   3. Periodic lightning controller: zigzag bolt (5 rotated segments) +
 *      full-screen white flash overlay (~15% peak opacity)
 *
 * Everything runs on the UI thread via Reanimated shared values.
 * No new dependencies — only Reanimated + LinearGradient + View.
 */
function LightningArena() {
  // Pre-compute cloud specs once — position, size, drift range, phase.
  const clouds = useMemo((): CloudSpec[] => [
    { leftPct: 0.05, topPct: 0.04, w: 260, h: 90, driftPx: 18, driftMs: 7000, initDelay: 0,    glowColor: 'rgba(100,80,200,0.28)' },
    { leftPct: 0.40, topPct: 0.10, w: 310, h: 100, driftPx: 22, driftMs: 9500, initDelay: 800,  glowColor: 'rgba(80,60,180,0.22)' },
    { leftPct: 0.60, topPct: 0.02, w: 240, h: 80,  driftPx: 15, driftMs: 6500, initDelay: 1600, glowColor: 'rgba(120,90,220,0.30)' },
  ], []);

  // Shared values driving the bolt and flash animations.
  const boltOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  // Bolt horizontal anchor — updated instantly (withTiming duration: 0) each
  // strike so the position snaps before the opacity ramps up.
  const boltLeftSV = useSharedValue(0.35);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const strike = () => {
      // Snap bolt to a new random horizontal position before it becomes visible.
      boltLeftSV.value = withTiming(0.1 + Math.random() * 0.65, { duration: 0 });

      // Flash overlay: ~80ms peak then quick fade. Total ~120ms, ceiling 0.15.
      flashOpacity.value = withSequence(
        withTiming(0.15, { duration: 40 }),
        withTiming(0,    { duration: 80, easing: Easing.in(Easing.quad) }),
      );

      // Bolt: flicker-in (two pulses) then fade. Total ~400ms.
      boltOpacity.value = withSequence(
        withTiming(1,   { duration: 40 }),
        withTiming(0.5, { duration: 60 }),
        withTiming(1,   { duration: 40 }),
        withTiming(0,   { duration: 260, easing: Easing.in(Easing.quad) }),
      );

      // Schedule next strike in 3-6 seconds.
      timer = setTimeout(strike, 3000 + Math.random() * 3000);
    };

    // First strike follows the same 3-6s cadence as all subsequent ones.
    timer = setTimeout(strike, 3000 + Math.random() * 3000);

    return () => {
      clearTimeout(timer);
      cancelAnimation(boltOpacity);
      cancelAnimation(flashOpacity);
      cancelAnimation(boltLeftSV);
    };
  }, [boltOpacity, flashOpacity, boltLeftSV]);

  const boltAnimStyle = useAnimatedStyle(() => ({
    opacity: boltOpacity.value,
    left: `${boltLeftSV.value * 100}%` as unknown as number,
  }));
  const flashAnimStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Cave base — deep teal/emerald depths */}
      <LinearGradient
        colors={['#010d08', '#022a1a', '#011a10', '#010a06']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle horizontal teal glow band */}
      <LinearGradient
        colors={['rgba(20,180,120,0.22)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[StyleSheet.absoluteFill, { height: '45%' }]}
      />

      {/* 2. Drifting storm clouds */}
      {clouds.map((c, i) => <StormCloud key={i} {...c} />)}

      {/* 3a. Lightning bolt — built from 5 rotated rectangle segments */}
      <Animated.View style={[lightningStyles.boltRoot, boltAnimStyle]} pointerEvents="none">
        <BoltSegment rotate={-18} />
        <BoltSegment rotate={22}  offsetX={6} />
        <BoltSegment rotate={-15} offsetX={2} />
        <BoltSegment rotate={20}  offsetX={7} />
        <BoltSegment rotate={-10} offsetX={3} />
      </Animated.View>

      {/* 3b. Full-screen flash overlay */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#ffffff' }, flashAnimStyle]}
      />
    </View>
  );
}

interface CloudSpec {
  leftPct: number;
  topPct: number;
  w: number;
  h: number;
  driftPx: number;
  driftMs: number;
  initDelay: number;
  glowColor: string;
}

function StormCloud({ leftPct, topPct, w, h, driftPx, driftMs, initDelay, glowColor }: CloudSpec) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    // Drift left↔right with a gentle ease-in-out feel.
    translateX.value = withDelay(
      initDelay,
      withRepeat(
        withSequence(
          withTiming(driftPx,   { duration: driftMs,     easing: Easing.inOut(Easing.quad) }),
          withTiming(-driftPx,  { duration: driftMs,     easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );

    // Slow glow pulse — the cloud "breathes" with electrical charge.
    opacity.value = withDelay(
      initDelay,
      withRepeat(
        withSequence(
          withTiming(0.75, { duration: driftMs * 0.6, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.35, { duration: driftMs * 0.6, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );

    return () => {
      cancelAnimation(translateX);
      cancelAnimation(opacity);
    };
  }, [translateX, opacity, driftPx, driftMs, initDelay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: `${leftPct * 100}%` as unknown as number,
          top: `${topPct * 100}%` as unknown as number,
          width: w,
          height: h,
          borderRadius: h * 0.55,
          backgroundColor: glowColor,
          shadowColor: '#7c60e0',
          shadowOpacity: 0.7,
          shadowRadius: 28,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        },
        style,
      ]}
    />
  );
}

/**
 * One segment of the lightning bolt. Each segment is a tall thin rectangle
 * rotated to form part of the zigzag. `offsetX` shifts the segment
 * horizontally so consecutive segments connect at their tips.
 */
function BoltSegment({ rotate, offsetX = 0 }: { rotate: number; offsetX?: number }) {
  return (
    <View
      style={{
        width: 3,
        height: 38,
        marginTop: -2,
        marginLeft: offsetX,
        borderRadius: 2,
        backgroundColor: '#ffffff',
        shadowColor: '#a0d8ff',
        shadowOpacity: 0.95,
        shadowRadius: 7,
        shadowOffset: { width: 0, height: 0 },
        elevation: 8,
        transform: [{ rotate: `${rotate}deg` }],
      }}
    />
  );
}

const lightningStyles = StyleSheet.create({
  boltRoot: {
    position: 'absolute',
    top: '5%',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
});
