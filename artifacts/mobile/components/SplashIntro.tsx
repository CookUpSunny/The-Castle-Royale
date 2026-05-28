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
import Svg, { Path } from 'react-native-svg';

interface SplashIntroProps {
  onDone: () => void;
}

const BEAM_LENGTH = 160;
const CORNER_BEAM_LENGTH = 55;
const CORNER_LEAD = 100;

function EnergyBorder({ width, height }: { width: number; height: number }) {
  const perimeter = 2 * (width + height);
  const [offset, setOffset] = useState(0);
  const [cornerOffset, setCornerOffset] = useState(0);

  useEffect(() => {
    // Primary beam — Animated.loop + Animated.timing as spec'd
    const primaryAnim = new Animated.Value(0);
    const primaryLoop = Animated.loop(
      Animated.timing(primaryAnim, {
        toValue: perimeter,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    const primaryId = primaryAnim.addListener(({ value }) => setOffset(value));
    primaryLoop.start();

    // Corner glow node — slower secondary beam (4 000 ms)
    const cornerAnim = new Animated.Value(CORNER_LEAD);
    const cornerLoop = Animated.loop(
      Animated.timing(cornerAnim, {
        toValue: perimeter + CORNER_LEAD,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    const cornerId = cornerAnim.addListener(({ value }) =>
      setCornerOffset(value % perimeter),
    );
    cornerLoop.start();

    return () => {
      primaryLoop.stop();
      cornerLoop.stop();
      primaryAnim.removeListener(primaryId);
      cornerAnim.removeListener(cornerId);
    };
  }, [perimeter]);

  const d = `M 2 2 L ${width - 2} 2 L ${width - 2} ${height - 2} L 2 ${height - 2} Z`;
  const perimStr = perimeter.toFixed(0);

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      {/* Wide soft purple glow — outer bloom */}
      <Path
        d={d}
        fill="none"
        stroke="#7c3aed"
        strokeWidth={12}
        strokeDasharray={`${BEAM_LENGTH},${perimStr}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        opacity={0.45}
      />
      {/* Teal mid layer */}
      <Path
        d={d}
        fill="none"
        stroke="#22d3ee"
        strokeWidth={5}
        strokeDasharray={`${BEAM_LENGTH},${perimStr}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        opacity={0.7}
      />
      {/* White-hot thin core */}
      <Path
        d={d}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        strokeDasharray={`${Math.round(BEAM_LENGTH * 0.45)},${perimStr}`}
        strokeDashoffset={-(offset + BEAM_LENGTH * 0.3)}
        strokeLinecap="round"
        opacity={0.95}
      />
      {/* Amber corner pulse node — slower secondary loop */}
      <Path
        d={d}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={5}
        strokeDasharray={`${CORNER_BEAM_LENGTH},${perimStr}`}
        strokeDashoffset={-cornerOffset}
        strokeLinecap="round"
        opacity={0.75}
      />
    </Svg>
  );
}

export default function SplashIntro({ onDone }: SplashIntroProps) {
  const { width, height } = useWindowDimensions();
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const borderOpacity = useRef(new Animated.Value(0)).current;
  const [showBorder, setShowBorder] = useState(false);
  const doneCalledRef = useRef(false);

  const finish = useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    // 1.3 s: start fading in hero image and energy border
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

    // 5.7 s total: sharp cut to lobby (1.3 dark + 0.4 fade + 4.0 hold)
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
      {/* Dark grey base — always visible */}
      <View style={[StyleSheet.absoluteFill, styles.darkBg]} />

      {/* Hero image fades in after 1.3 s */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]}>
        <Image
          source={require('../assets/splash/splash_hero.png')}
          style={{ width, height }}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Energy border fades in with the image */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: borderOpacity }]}
        pointerEvents="none"
      >
        {showBorder && <EnergyBorder width={width} height={height} />}
      </Animated.View>

      {/* "Loading..." — pinned at bottom above the energy bar */}
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
