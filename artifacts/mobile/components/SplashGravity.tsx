import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

interface SplashGravityProps {
  onDone: () => void;
}

const TOTAL_DURATION = 3690;
const FADE_OUT_DURATION = 350;

const PARTICLE_COLORS = [
  '#00e5ff',
  '#ff4fc8',
  '#39ff14',
  '#ff5722',
  '#ffe135',
  '#bf5fff',
  '#00bcd4',
  '#ff6b9d',
  '#76ff03',
  '#ff9100',
  '#40c4ff',
  '#ea80fc',
  '#b2ff59',
  '#ff6e40',
  '#18ffff',
  '#e040fb',
];

const PARTICLE_RADII = [4, 6, 7, 8, 5, 9, 6, 10, 5, 7, 8, 6, 9, 5, 7, 14];

const TRAVEL_DURATION = 1200;

interface ParticleConfig {
  color: string;
  radius: number;
  startX: number;
  startY: number;
  delay: number;
}

function buildParticles(cx: number, cy: number): ParticleConfig[] {
  const configs: ParticleConfig[] = [];
  const count = PARTICLE_COLORS.length;

  const rng = (seed: number) => {
    const x = Math.sin(seed + 1) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < count; i++) {
    const angle = rng(i * 7.3) * Math.PI * 2;
    const dist = 60 + rng(i * 3.1 + 5) * 160;
    const startX = cx + Math.cos(angle) * dist;
    const startY = cy + Math.sin(angle) * dist;
    const delay = rng(i * 11.7 + 2) * 2500;

    configs.push({
      color: PARTICLE_COLORS[i],
      radius: PARTICLE_RADII[i],
      startX,
      startY,
      delay,
    });
  }
  return configs;
}

const PULSE_COUNT = 4;
const PULSE_INTERVAL = 800;

function PulseRing({ cx, cy, delay }: { cx: number; cy: number; delay: number }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 4,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.55,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 1220,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 0, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const SIZE = 32;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx - SIZE / 2,
        top: cy - SIZE / 2,
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: 1.5,
        borderColor: 'rgba(200,160,255,0.9)',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

function Particle({ cx, cy, config }: { cx: number; cy: number; config: ParticleConfig }) {
  const translateX = useRef(new Animated.Value(config.startX)).current;
  const translateY = useRef(new Animated.Value(config.startY)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const seq = Animated.sequence([
      Animated.delay(config.delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: cx,
          duration: TRAVEL_DURATION,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: cy,
          duration: TRAVEL_DURATION,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0,
          duration: TRAVEL_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: TRAVEL_DURATION,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);
    seq.start();
  }, []);

  const d = config.radius * 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: d,
        height: d,
        borderRadius: config.radius,
        backgroundColor: config.color,
        opacity,
        transform: [
          { translateX: Animated.add(translateX, new Animated.Value(-config.radius)) },
          { translateY: Animated.add(translateY, new Animated.Value(-config.radius)) },
          { scale },
        ],
        shadowColor: config.color,
        shadowOpacity: 0.9,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      }}
    />
  );
}

export default function SplashGravity({ onDone }: SplashGravityProps) {
  const { width, height } = useWindowDimensions();
  const cx = width / 2;
  const cy = height / 2;

  const blackOpacity = useRef(new Animated.Value(0)).current;
  const sceneOpacity = useRef(new Animated.Value(1)).current;
  const doneCalledRef = useRef(false);

  const particles = useRef(buildParticles(cx, cy)).current;

  const finish = useCallback(() => {
    if (doneCalledRef.current) return;
    doneCalledRef.current = true;

    Animated.timing(blackOpacity, {
      toValue: 1,
      duration: FADE_OUT_DURATION,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => onDone());
  }, [onDone, blackOpacity]);

  useEffect(() => {
    const timer = setTimeout(finish, TOTAL_DURATION);
    return () => clearTimeout(timer);
  }, [finish]);

  const CORE_SIZE = 44;
  const GLOW_SIZE = 120;

  return (
    <Pressable
      onPress={finish}
      style={[styles.container, { width, height }]}
      accessible={false}
    >
      <View style={[StyleSheet.absoluteFill, styles.bg]} />

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: sceneOpacity }]}
      >
        {/* Soft radial glow behind core */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - GLOW_SIZE / 2,
            top: cy - GLOW_SIZE / 2,
            width: GLOW_SIZE,
            height: GLOW_SIZE,
            borderRadius: GLOW_SIZE / 2,
            backgroundColor: 'transparent',
            shadowColor: '#9b59ff',
            shadowOpacity: 0.95,
            shadowRadius: 40,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <View
            style={{
              width: GLOW_SIZE,
              height: GLOW_SIZE,
              borderRadius: GLOW_SIZE / 2,
              backgroundColor: 'rgba(120,60,220,0.18)',
            }}
          />
        </View>

        {/* Pulse rings */}
        {Array.from({ length: PULSE_COUNT }).map((_, i) => (
          <PulseRing key={i} cx={cx} cy={cy} delay={i * PULSE_INTERVAL} />
        ))}

        {/* Particles */}
        {particles.map((p, i) => (
          <Particle key={i} cx={cx} cy={cy} config={p} />
        ))}

        {/* Core sphere layers (outer glow → inner bright) */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - CORE_SIZE,
            top: cy - CORE_SIZE,
            width: CORE_SIZE * 2,
            height: CORE_SIZE * 2,
            borderRadius: CORE_SIZE,
            backgroundColor: 'rgba(140,80,255,0.25)',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - CORE_SIZE * 0.7,
            top: cy - CORE_SIZE * 0.7,
            width: CORE_SIZE * 1.4,
            height: CORE_SIZE * 1.4,
            borderRadius: CORE_SIZE,
            backgroundColor: 'rgba(170,110,255,0.45)',
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - CORE_SIZE / 2,
            top: cy - CORE_SIZE / 2,
            width: CORE_SIZE,
            height: CORE_SIZE,
            borderRadius: CORE_SIZE / 2,
            backgroundColor: 'rgba(210,170,255,0.75)',
            shadowColor: '#c084fc',
            shadowOpacity: 1,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - 10,
            top: cy - 10,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#f0e6ff',
          }}
        />
      </Animated.View>

      {/* Fade-to-black overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.blackOverlay, { opacity: blackOpacity }]}
        pointerEvents="none"
      />
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
  bg: {
    backgroundColor: '#000000',
  },
  blackOverlay: {
    backgroundColor: '#000000',
  },
});
