import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SplashIntroProps {
  onDone: () => void;
}

const BEAM_LENGTH = 160;
const BEAM_SPEED = 5;
const CORNER_BEAM_LENGTH = 60;
const CORNER_OFFSET = 90;

function EnergyBorder({ width, height }: { width: number; height: number }) {
  const perimeter = 2 * (width + height);
  const [offset, setOffset] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setOffset(prev => (prev + BEAM_SPEED) % perimeter);
    }, 16);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [perimeter]);

  const d = `M 2 2 L ${width - 2} 2 L ${width - 2} ${height - 2} L 2 ${height - 2} Z`;

  const outerDash = `${BEAM_LENGTH},${perimeter - BEAM_LENGTH}`;
  const innerDash = `${BEAM_LENGTH * 0.5},${perimeter - BEAM_LENGTH * 0.5}`;
  const cornerDash = `${CORNER_BEAM_LENGTH},${perimeter - CORNER_BEAM_LENGTH}`;

  const neg = (v: number) => -v;

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
    >
      {/* Wide soft purple glow */}
      <Path
        d={d}
        fill="none"
        stroke="#7c3aed"
        strokeWidth={10}
        strokeDasharray={outerDash}
        strokeDashoffset={neg(offset)}
        strokeLinecap="round"
        opacity={0.55}
      />
      {/* Mid teal accent */}
      <Path
        d={d}
        fill="none"
        stroke="#22d3ee"
        strokeWidth={5}
        strokeDasharray={outerDash}
        strokeDashoffset={neg(offset)}
        strokeLinecap="round"
        opacity={0.65}
      />
      {/* Thin white-hot core */}
      <Path
        d={d}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        strokeDasharray={innerDash}
        strokeDashoffset={neg(offset + BEAM_LENGTH * 0.25)}
        strokeLinecap="round"
        opacity={0.95}
      />
      {/* Corner pulse — amber energy node trailing behind */}
      <Path
        d={d}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={4}
        strokeDasharray={cornerDash}
        strokeDashoffset={neg((offset + CORNER_OFFSET) % perimeter)}
        strokeLinecap="round"
        opacity={0.7}
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
    // 1.3s: start fading in the hero image + border
    const fadeTimer = setTimeout(() => {
      setShowBorder(true);
      Animated.parallel([
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(borderOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1300);

    // 5.7s total: sharp cut to lobby
    const exitTimer = setTimeout(finish, 5700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(exitTimer);
    };
  }, [finish, imageOpacity, borderOpacity]);

  return (
    <TouchableWithoutFeedback onPress={finish} accessible={false}>
      <View style={[styles.container, { width, height }]}>
        {/* Dark grey base */}
        <View style={[StyleSheet.absoluteFill, styles.darkBg]} />

        {/* Hero image fades in */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: imageOpacity }]}>
          <Image
            source={require('../assets/splash/splash_hero.png')}
            style={{ width, height }}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Energy border fades in with image */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: borderOpacity }]}
          pointerEvents="none"
        >
          {showBorder && <EnergyBorder width={width} height={height} />}
        </Animated.View>

        {/* Loading text — bottom of screen, above the energy bar */}
        <View style={styles.loadingRow} pointerEvents="none">
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
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
