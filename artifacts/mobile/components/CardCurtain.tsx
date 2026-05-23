import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const CARD_W           = 72;
const CARD_H           = 100;
const GAP              = 4;
const ENTER_DURATION   = 800;   // cards rain down in ~0.8 s
const EXIT_DURATION    = 1800;  // gravity fall — accelerating drop
const HOLD_AFTER_LAND  = 400;   // brief pause before onContentReady fires

// ~30 % of curtain cards show their face
const FACE_UP_CHANCE   = 0.30;

const VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'] as const;
const SUITS  = ['♠', '♥', '♦', '♣'] as const;
type Suit = (typeof SUITS)[number];

function randomValue(): string {
  return VALUES[Math.floor(Math.random() * VALUES.length)]!;
}
function randomSuit(): Suit {
  return SUITS[Math.floor(Math.random() * SUITS.length)]!;
}
function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}

interface CardSpec {
  id: number;
  row: number;
  x: number;
  y: number;
  enterDelay: number;
  /** ms after sweep starts before this card begins its fall */
  exitDelay: number;
  /** random horizontal drift during fall (px) */
  exitDriftX: number;
  initTranslateY: number;
  isFaceUp: boolean;
  displayValue: string;
  displaySuit: Suit;
  /** shadow/glow colour for this card */
  glowColor: string;
}

interface CurtainCardProps {
  spec: CardSpec;
  sweeping: boolean;
  screenHeight: number;
}

function CurtainCard({ spec, sweeping, screenHeight }: CurtainCardProps) {
  const translateY = useSharedValue(spec.initTranslateY);
  const translateX = useSharedValue(0);

  // Enter: rain down from above
  useEffect(() => {
    translateY.value = withDelay(
      spec.enterDelay,
      withTiming(0, { duration: ENTER_DURATION, easing: Easing.in(Easing.quad) }),
    );
  }, []);

  // Exit: gravity fall — bottom rows go first (lower exitDelay), creating a
  // bottom-to-top cascade that peels the curtain away revealing the result.
  useEffect(() => {
    if (!sweeping) return;
    translateY.value = withDelay(
      spec.exitDelay,
      withTiming(screenHeight + CARD_H + 60, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.cubic),  // cubic gives believable gravity acceleration
      }),
    );
    translateX.value = withDelay(
      spec.exitDelay,
      withTiming(spec.exitDriftX, {
        duration: EXIT_DURATION,
        easing: Easing.in(Easing.quad),
      }),
    );
  }, [sweeping]);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: spec.x,
    top: spec.y,
    width: CARD_W,
    height: CARD_H,
    // Glow via shadow
    shadowColor: spec.glowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  const red = isRedSuit(spec.displaySuit);

  return (
    <Animated.View style={animStyle}>
      {spec.isFaceUp ? (
        // Face-up card — white background, rank + suit
        <View style={styles.faceUp}>
          {/* Top-left corner label */}
          <View style={styles.cornerTL}>
            <Text style={[styles.cornerValue, red ? styles.redText : styles.blackText]}>
              {spec.displayValue}
            </Text>
            <Text style={[styles.cornerSuit, red ? styles.redText : styles.blackText]}>
              {spec.displaySuit}
            </Text>
          </View>
          {/* Centre suit */}
          <Text style={[styles.centreSuit, red ? styles.redText : styles.blackText]}>
            {spec.displaySuit}
          </Text>
          {/* Bottom-right corner label (inverted) */}
          <View style={[styles.cornerTL, styles.cornerBR]}>
            <Text style={[styles.cornerValue, red ? styles.redText : styles.blackText]}>
              {spec.displayValue}
            </Text>
            <Text style={[styles.cornerSuit, red ? styles.redText : styles.blackText]}>
              {spec.displaySuit}
            </Text>
          </View>
        </View>
      ) : (
        // Face-down card — existing purple gradient back
        <LinearGradient
          colors={['#1F0F3D', '#070412', '#1F0F3D']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.faceDown}
        >
          <View style={styles.backInner} />
          <Text style={styles.crownText}>♛</Text>
        </LinearGradient>
      )}
    </Animated.View>
  );
}

interface CardCurtainProps {
  onContentReady: () => void;
  sweeping: boolean;
}

export default function CardCurtain({ onContentReady, sweeping }: CardCurtainProps) {
  const { width, height } = useWindowDimensions();
  const wrapperOpacity = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { cards, onReadyDelay } = useMemo(() => {
    const totalCols = Math.floor(width / (CARD_W + GAP));
    const totalRows = Math.ceil(height / (CARD_H + GAP)) + 1;
    const extraX    = (width - totalCols * (CARD_W + GAP) + GAP) / 2;
    const specs: CardSpec[] = [];
    let id = 0;
    let maxEnterEnd = 0;

    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
        const enterDelay = col * 55 + row * 35 + Math.random() * 40;
        const enterEnd   = enterDelay + ENTER_DURATION;
        if (enterEnd > maxEnterEnd) maxEnterEnd = enterEnd;

        // Bottom rows fall first: row (totalRows-1) → exitDelay ≈ 0,
        // top row (0) → longest delay.
        const exitDelay = (totalRows - 1 - row) * 28 + Math.random() * 40;

        const exitDriftX  = (Math.random() - 0.5) * 40; // ±20 px natural scatter
        const initTranslateY = -(row * (CARD_H + GAP) + CARD_H + 50 + Math.random() * 80);

        const isFaceUp = Math.random() < FACE_UP_CHANCE;
        const suit      = randomSuit();
        const glowColor = isFaceUp
          ? (isRedSuit(suit) ? '#ef4444' : '#fbbf24')
          : 'rgba(168,85,247,1)';

        specs.push({
          id: id++,
          row,
          x: extraX + col * (CARD_W + GAP),
          y: row * (CARD_H + GAP),
          enterDelay,
          exitDelay,
          exitDriftX,
          initTranslateY,
          isFaceUp,
          displayValue: randomValue(),
          displaySuit: suit,
          glowColor,
        });
      }
    }

    // onContentReady fires once enter animation + short hold are done.
    // The victory screen content then fades in while the cards are still falling,
    // so the result is "revealed through" the parting curtain.
    return { cards: specs, onReadyDelay: Math.ceil(maxEnterEnd + HOLD_AFTER_LAND) };
  }, [width, height]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onContentReady();
    }, onReadyDelay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onReadyDelay]);

  // Once all cards have fallen away, fade the wrapper out to clean up any
  // stragglers (e.g. slow top-row cards still animating).
  useEffect(() => {
    if (sweeping) {
      const maxStagger = cards.reduce((m, c) => Math.max(m, c.exitDelay), 0);
      const cleanupAt  = maxStagger + EXIT_DURATION + 100;
      const t = setTimeout(() => {
        wrapperOpacity.value = withTiming(0, { duration: 300 });
      }, cleanupAt);
      return () => clearTimeout(t);
    }
  }, [sweeping, cards]);

  const wrapperStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFill,
    opacity: wrapperOpacity.value,
  }));

  return (
    <Animated.View style={wrapperStyle} pointerEvents="none">
      {cards.map((spec) => (
        <CurtainCard
          key={spec.id}
          spec={spec}
          sweeping={sweeping}
          screenHeight={height}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // ── Face-up card
  faceUp: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTL: {
    position: 'absolute',
    top: 4,
    left: 5,
    alignItems: 'center',
  },
  cornerBR: {
    top: undefined,
    left: undefined,
    bottom: 4,
    right: 5,
    transform: [{ rotate: '180deg' }],
  },
  cornerValue: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
    letterSpacing: -0.5,
  },
  cornerSuit: {
    fontSize: 9,
    lineHeight: 10,
  },
  centreSuit: {
    fontSize: 30,
    lineHeight: 34,
  },
  redText:   { color: '#dc2626' },
  blackText: { color: '#111111' },

  // ── Face-down card (original design)
  faceDown: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backInner: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
  },
  crownText: {
    fontSize: 26,
    lineHeight: 32,
    color: '#A855F7',
    textShadowColor: 'rgba(168,85,247,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
