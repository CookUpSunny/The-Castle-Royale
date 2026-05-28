import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, {
  Defs,
  FeGaussianBlur,
  Filter,
  Path,
} from 'react-native-svg';

interface SplashIntroProps {
  onDone: () => void;
}

// ─── Siri-style border glow ────────────────────────────────────────────────
// Architecture:
//  1. Solid base ring  — always-lit, no dasharray → zero dark gaps anywhere
//  2. Three large color zones (violet 55 %, teal 45 %, amber 35 %) drift
//     around at different speeds; teal runs counter-clockwise
//  3. feGaussianBlur filters give the volumetric "tube of trapped light" feel
//  4. A thin crisp white ring sits on top without a filter for sharpness
//  5. Breathing pulse (0.75 → 1.0 → 0.75, 3 s) lives on an inner Animated.View
// ──────────────────────────────────────────────────────────────────────────

function EnergyBorder({ width, height }: { width: number; height: number }) {
  const perimeter = 2 * (width + height);

  // State values driven by Animated.loop listeners (dashoffset can't use native driver)
  const [violetOff, setVioletOff] = useState(0);
  const [tealOff, setTealOff] = useState(0);
  const [amberOff, setAmberOff] = useState(0);

  // Breathing pulse — opacity-only so it CAN use native driver
  const breathAnim = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    // ── Colour zone offsets ────────────────────────────────────────────
    // Violet — forward, 5 s
    const violetAnim = new Animated.Value(0);
    const violetLoop = Animated.loop(
      Animated.timing(violetAnim, {
        toValue: perimeter,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    const violetId = violetAnim.addListener(({ value }) => setVioletOff(value));
    violetLoop.start();

    // Teal — counter-clockwise (offset increases = reverse direction), 8 s
    const tealAnim = new Animated.Value(0);
    const tealLoop = Animated.loop(
      Animated.timing(tealAnim, {
        toValue: perimeter,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    const tealId = tealAnim.addListener(({ value }) => setTealOff(value));
    tealLoop.start();

    // Amber — forward, 3 s (fastest, creates crossings)
    const amberAnim = new Animated.Value(0);
    const amberLoop = Animated.loop(
      Animated.timing(amberAnim, {
        toValue: perimeter,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    const amberId = amberAnim.addListener(({ value }) => setAmberOff(value));
    amberLoop.start();

    // ── Breathing pulse ────────────────────────────────────────────────
    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0.75,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    breathLoop.start();

    return () => {
      violetLoop.stop();
      tealLoop.stop();
      amberLoop.stop();
      breathLoop.stop();
      violetAnim.removeListener(violetId);
      tealAnim.removeListener(tealId);
      amberAnim.removeListener(amberId);
    };
  }, [perimeter, breathAnim]);

  // Path drawn 4 px inside screen edges so the thick bloom stays fully visible
  const d = `M 4 4 L ${width - 4} 4 L ${width - 4} ${height - 4} L 4 ${height - 4} Z`;
  const P = perimeter;

  return (
    // Breathing pulse wraps the whole SVG — native driver OK (opacity only)
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: breathAnim }]}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Heavy outer bloom — makes the "tube" feel wide and volumetric */}
          <Filter id="bloom_heavy" x="-60%" y="-60%" width="220%" height="220%">
            <FeGaussianBlur stdDeviation="14" />
          </Filter>
          {/* Medium bloom — for colour zone softness */}
          <Filter id="bloom_mid" x="-30%" y="-30%" width="160%" height="160%">
            <FeGaussianBlur stdDeviation="6" />
          </Filter>
          {/* Tight bloom — subtle glow on amber accent */}
          <Filter id="bloom_tight" x="-20%" y="-20%" width="140%" height="140%">
            <FeGaussianBlur stdDeviation="3" />
          </Filter>
        </Defs>

        {/* ── BASE RING — solid, no dasharray, ensures zero dark gaps ─── */}

        {/* Outermost wide halo — heavy bloom, always-on */}
        <Path
          d={d}
          fill="none"
          stroke="#5b21b6"
          strokeWidth={28}
          filter="url(#bloom_heavy)"
          opacity={0.45}
        />
        {/* Base violet glow ring — medium bloom, always-on */}
        <Path
          d={d}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={12}
          filter="url(#bloom_mid)"
          opacity={0.5}
        />

        {/* ── COLOUR ZONES — large dashes drifting around the base ───── */}

        {/* Violet zone — 55 % of perimeter, forward, 5 s */}
        <Path
          d={d}
          fill="none"
          stroke="#a78bfa"
          strokeWidth={16}
          strokeDasharray={`${P * 0.55} ${P * 0.45}`}
          strokeDashoffset={-violetOff}
          strokeLinecap="butt"
          filter="url(#bloom_mid)"
          opacity={0.7}
        />

        {/* Teal zone — 45 % of perimeter, REVERSE (positive offset), 8 s */}
        <Path
          d={d}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={12}
          strokeDasharray={`${P * 0.45} ${P * 0.55}`}
          strokeDashoffset={tealOff}
          strokeLinecap="butt"
          filter="url(#bloom_mid)"
          opacity={0.65}
        />

        {/* Amber accent — 35 % of perimeter, forward, 3 s (fastest) */}
        <Path
          d={d}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={8}
          strokeDasharray={`${P * 0.35} ${P * 0.65}`}
          strokeDashoffset={-amberOff}
          strokeLinecap="butt"
          filter="url(#bloom_tight)"
          opacity={0.6}
        />

        {/* ── SHARP CORE — thin white ring, no blur, always crisp ──── */}

        {/* Solid thin white ring — ensures the whole perimeter always has a crisp edge */}
        <Path
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
          opacity={0.35}
        />
        {/* Bright white highlight that travels with the violet zone */}
        <Path
          d={d}
          fill="none"
          stroke="#ffffff"
          strokeWidth={1}
          strokeDasharray={`${P * 0.28} ${P * 0.72}`}
          strokeDashoffset={-(violetOff + P * 0.15)}
          strokeLinecap="butt"
          opacity={0.85}
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Main intro component ──────────────────────────────────────────────────

export default function SplashIntro({ onDone }: SplashIntroProps) {
  const { width, height } = useWindowDimensions();

  const imageOpacity = useRef(new Animated.Value(0)).current;
  const borderOpacity = useRef(new Animated.Value(0)).current;

  const [showBorder, setShowBorder] = useState(false);
  const doneCalledRef = useRef(false);

  // finish() fades image + border out together, then unmounts
  const finish = useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;

    Animated.parallel([
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(borderOpacity, {
        toValue: 0,
        duration: 350,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onDone());
  }, [onDone, imageOpacity, borderOpacity]);

  useEffect(() => {
    // 1.3 s dark grey hold → fade in image + border together
    const fadeTimer = setTimeout(() => {
      setShowBorder(true);
      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }, 1300);

    // Auto-dismiss at 5.7 s (finish() adds ~350 ms fade, total ~6 s)
    const exitTimer = setTimeout(finish, 5700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(exitTimer);
    };
  }, [finish, imageOpacity, borderOpacity]);

  return (
    <Pressable
      onPress={finish}
      style={[styles.container, { width, height }]}
      accessible={false}
    >
      {/* Dark grey base — always visible behind everything */}
      <View style={[StyleSheet.absoluteFill, styles.darkBg]} />

      {/* Hero image fades in after 1.3 s.
          Image is 941×1672 (aspect 0.563) — wider than a phone screen.
          Scale to full screen height and right-anchor so the title portion
          (right side) stays fully visible and centred; left overflow clips. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: imageOpacity, overflow: 'hidden' },
        ]}
      >
        <Image
          source={require('../assets/splash/splash_hero.png')}
          style={{
            position: 'absolute',
            left: (width - Math.round((941 / 1672) * height)) / 2,
            top: 0,
            width: Math.round((941 / 1672) * height),
            height,
          }}
          resizeMode="stretch"
        />
      </Animated.View>

      {/* Siri-glow border — fades in with image, fades out on dismiss */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: borderOpacity }]}
        pointerEvents="none"
      >
        {showBorder && <EnergyBorder width={width} height={height} />}
      </Animated.View>

      {/* Loading label — pinned at bottom */}
      <View style={styles.loadingRow} pointerEvents="none">
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9999,
  },
  darkBg: {
    backgroundColor: '#1a1a1a',
  },
  loadingRow: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '500',
  },
});
