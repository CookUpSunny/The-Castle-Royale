import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
import Reanimated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Opening splash: gold cards free-fall and flip over green felt, behind the
 * crown + title art, which "ignites" in on load.
 *
 * Tuned values (from the HTML design pass): fall 0.5 · 45 cards · no shimmer
 * · no steady glow. Change the constants below to retune.
 *
 * Layers, back to front: felt → falling cards → gold dust → title cut-out.
 * The title art (assets/splash/splash_title.png) is the old static splash with
 * the felt knocked out to transparent so the cards show through behind it.
 */

interface SplashIntroProps {
  onDone: () => void;
}

// ── Tuning ──────────────────────────────────────────────────────────────────
const FALL_SPEED = 0.5;
const CARD_COUNT = 45;
const SPARK_COUNT = 22;
/** Cards pour in fast on load, then ease down to FALL_SPEED. */
const LOAD_BOOST = 2.4;
const BOOST_DECAY = 0.7;
const HOLD_MS = 4000;
const FADE_OUT_MS = 400;
const IGNITE_MS = 1300;

/** Art is 9:16. Cards and title are sized from the art, not the window. */
const ART_ASPECT = 576 / 1024;
const CARD_ASPECT = 1.4;
/** Fall track in % of screen height: starts above the top, ends below. */
const TRACK_START = -30;
const TRACK_LEN = 152;

const RANKS = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
const SUITS = [
  ['♠', '#141414'],
  ['♥', '#c0182b'],
  ['♦', '#c0182b'],
  ['♣', '#141414'],
] as const;

const rnd = (a: number, b: number) => a + (b - a) * Math.random();

interface CardSpec {
  key: number;
  xPct: number;
  y0: number;
  scale: number;
  speed: number;
  flipSpeed: number;
  angle0: number;
  rotZ: number;
  rank: string;
  suit: string;
  color: string;
}

interface SparkSpec {
  key: number;
  xPct: number;
  yPct: number;
  period: number;
  phase: number;
}

function buildCards(): CardSpec[] {
  return Array.from({ length: CARD_COUNT }, (_, key) => {
    const scale = rnd(0.45, 1.15);
    const [suit, color] = SUITS[Math.floor(Math.random() * SUITS.length)]!;
    return {
      key,
      xPct: rnd(2, 94),
      y0: rnd(0, TRACK_LEN),
      scale,
      // Bigger (closer) cards fall faster, for depth.
      speed: rnd(28, 55) * (0.6 + scale),
      flipSpeed: rnd(120, 300) * (Math.random() < 0.5 ? 1 : -1),
      angle0: rnd(0, 360),
      rotZ: rnd(-18, 18),
      rank: RANKS[Math.floor(Math.random() * RANKS.length)]!,
      suit,
      color,
    };
  }).sort((a, b) => a.scale - b.scale); // small (far) cards render first
}

function buildSparks(): SparkSpec[] {
  return Array.from({ length: SPARK_COUNT }, (_, key) => ({
    key,
    xPct: rnd(3, 97),
    yPct: rnd(3, 97),
    period: rnd(2.5, 6),
    phase: rnd(0, 5),
  }));
}

interface FallingCardProps {
  spec: CardSpec;
  /** Boost-warped seconds: drives the fall. */
  fallClock: SharedValue<number>;
  /** Plain seconds: drives the flip. */
  clock: SharedValue<number>;
  cardW: number;
  screenH: number;
}

const FallingCard = React.memo(function FallingCard({
  spec,
  fallClock,
  clock,
  cardW,
  screenH,
}: FallingCardProps) {
  const cardH = Math.round(cardW * CARD_ASPECT);

  const bodyStyle = useAnimatedStyle(() => {
    const travelled = (spec.y0 + spec.speed * FALL_SPEED * fallClock.value) % TRACK_LEN;
    const y = ((TRACK_START + travelled) / 100) * screenH;
    const rad = ((spec.angle0 + spec.flipSpeed * clock.value) * Math.PI) / 180;
    // Flip as a horizontal squash. Looks like rotateY, with no perspective or
    // backface quirks on either platform.
    const squash = Math.max(0.04, Math.abs(Math.cos(rad)));
    return {
      transform: [
        { translateY: y },
        { rotate: `${spec.rotZ}deg` },
        { scaleX: squash * spec.scale },
        { scaleY: spec.scale },
      ],
    };
  });

  const faceStyle = useAnimatedStyle(() => {
    const rad = ((spec.angle0 + spec.flipSpeed * clock.value) * Math.PI) / 180;
    return { opacity: Math.cos(rad) >= 0 ? 1 : 0 };
  });

  const corner = Math.max(7, cardW * 0.24);

  return (
    <Reanimated.View
      style={[
        styles.card,
        { left: `${spec.xPct}%`, width: cardW, height: cardH, borderRadius: cardW * 0.09 },
        bodyStyle,
      ]}
    >
      {/* Back: dark with a gold crown. Always there; the face covers it. */}
      <View style={[styles.cardBack, { borderRadius: cardW * 0.09 }]}>
        <Text style={[styles.crown, { fontSize: cardW * 0.5 }]}>♛</Text>
      </View>
      <Reanimated.View style={[styles.cardFace, { borderRadius: cardW * 0.09 }, faceStyle]}>
        <Text style={[styles.cornerTL, { color: spec.color, fontSize: corner, lineHeight: corner }]}>
          {spec.rank}
          {'\n'}
          {spec.suit}
        </Text>
        <Text style={{ color: spec.color, fontSize: cardW * 0.55 }}>{spec.suit}</Text>
        <Text style={[styles.cornerBR, { color: spec.color, fontSize: corner, lineHeight: corner }]}>
          {spec.rank}
          {'\n'}
          {spec.suit}
        </Text>
      </Reanimated.View>
    </Reanimated.View>
  );
});

const Spark = React.memo(function Spark({
  spec,
  clock,
}: {
  spec: SparkSpec;
  clock: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const wave = 0.5 - 0.5 * Math.cos(((clock.value + spec.phase) / spec.period) * Math.PI * 2);
    return { opacity: 0.1 + 0.8 * wave, transform: [{ scale: 0.5 + 0.5 * wave }] };
  });
  return (
    <Reanimated.View
      style={[styles.spark, { left: `${spec.xPct}%`, top: `${spec.yPct}%` }, style]}
    />
  );
});

export default function SplashIntro({ onDone }: SplashIntroProps) {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(1.06)).current;
  const blackOpacity = useRef(new Animated.Value(0)).current;

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const settledRef = useRef(false);

  const cards = useMemo(buildCards, []);
  const sparks = useMemo(buildSparks, []);

  const clock = useSharedValue(0);
  const fallClock = useSharedValue(0);
  const boost = useSharedValue(LOAD_BOOST);

  useFrameCallback((frame) => {
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 1 / 30);
    boost.value += (1 - boost.value) * Math.min(1, dt * BOOST_DECAY);
    clock.value += dt;
    fallClock.value += dt * boost.value;
  }, !reducedMotion);

  const finish = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    onDoneRef.current();
  }, []);

  const playOut = useCallback(() => {
    if (settledRef.current) return;
    Animated.timing(blackOpacity, {
      toValue: 1,
      duration: FADE_OUT_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => finish());
    // Native completion callbacks can be dropped on device. Don't wait on them.
    const backup = setTimeout(finish, FADE_OUT_MS + 500);
    return () => clearTimeout(backup);
  }, [blackOpacity, finish]);

  useEffect(() => {
    // Ignite: the title flares in slightly oversized, then settles.
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: IGNITE_MS * 0.6,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(titleScale, {
        toValue: 1,
        duration: IGNITE_MS,
        easing: Easing.bezier(0.2, 0.7, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();

    let clearBackup = () => {};
    const exitTimer = setTimeout(() => {
      clearBackup = playOut() ?? (() => {});
    }, HOLD_MS);

    return () => {
      clearTimeout(exitTimer);
      clearBackup();
    };
  }, [playOut, titleOpacity, titleScale]);

  // Cover-fit the 9:16 art: fill the height, centre, let the sides crop.
  const artH = Math.max(height, width / ART_ASPECT);
  const artW = artH * ART_ASPECT;
  const cardW = Math.round(Math.min(width, artW) * 0.085);

  return (
    <Pressable
      onPress={finish}
      style={[styles.container, { width, height }]}
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
    >
      <Image
        source={require('../assets/splash/splash_felt.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="stretch"
      />

      {reducedMotion ? null : (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {cards.map((spec) => (
            <FallingCard
              key={spec.key}
              spec={spec}
              fallClock={fallClock}
              clock={clock}
              cardW={cardW}
              screenH={height}
            />
          ))}
          {sparks.map((spec) => (
            <Spark key={spec.key} spec={spec} clock={clock} />
          ))}
        </View>
      )}

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { opacity: titleOpacity, transform: [{ scale: titleScale }] },
        ]}
        pointerEvents="none"
      >
        <Image
          source={require('../assets/splash/splash_title.png')}
          style={{
            position: 'absolute',
            left: (width - artW) / 2,
            top: (height - artH) / 2,
            width: artW,
            height: artH,
          }}
          resizeMode="stretch"
        />
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFill, styles.blackOverlay, { opacity: blackOpacity }]}
        pointerEvents="none"
      />

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
    overflow: 'hidden',
    backgroundColor: '#04100a',
  },
  card: {
    position: 'absolute',
    top: 0,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  cardBack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0c1810',
    borderWidth: 2,
    borderColor: '#f0d27a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crown: {
    color: '#f0d27a',
  },
  cardFace: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ecc863',
    borderWidth: 2,
    borderColor: '#fde9a8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cornerTL: {
    position: 'absolute',
    top: '5%',
    left: '7%',
    fontWeight: '800',
    textAlign: 'center',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '5%',
    right: '7%',
    fontWeight: '800',
    textAlign: 'center',
    transform: [{ rotate: '180deg' }],
  },
  spark: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#fff3c4',
  },
  blackOverlay: {
    backgroundColor: '#000000',
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
