import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import CardComponent from '@/components/Card';
import { CardBack } from '@/components/Card';
import { type Card as CardType } from '@/contexts/GameContext';

// ── Card definitions ────────────────────────────────────────────────────────
// 5-card column down the screen centre.
// xFrac is always near 0.5; slight alternating offset gives a subtle zigzag
// so the column reads as intentional, not a ruler.
// Order top → bottom matches the stagger: card 0 appears first, card 4 last.
interface CurtainCardDef {
  card: CardType;
  faceDown: boolean;
  golden: boolean;
  glowColor: string;
  xFrac: number;
  yFrac: number;
  rot: number;
}

const CURTAIN_CARDS: CurtainCardDef[] = [
  // ── 10 of Clubs — top, face-down, gentle right tilt ──────────────────────
  { card: { id: 'curtain-0', suit: 'C', value: 10 } as CardType, faceDown: true,  golden: false, glowColor: '#a855f7', xFrac: 0.52, yFrac: 0.12, rot:  5 },
  // ── King of Hearts — upper-centre, left tilt ─────────────────────────────
  { card: { id: 'curtain-1', suit: 'H', value: 13 } as CardType, faceDown: false, golden: false, glowColor: '#ef4444', xFrac: 0.48, yFrac: 0.28, rot: -6 },
  // ── Golden Ace of Spades — screen centre, slight left tilt ───────────────
  { card: { id: 'curtain-2', suit: 'S', value: 1  } as CardType, faceDown: false, golden: true,  glowColor: '#f59e0b', xFrac: 0.50, yFrac: 0.46, rot:  4 },
  // ── Queen of Diamonds — lower-centre, right tilt ─────────────────────────
  { card: { id: 'curtain-3', suit: 'D', value: 12 } as CardType, faceDown: false, golden: false, glowColor: '#f97316', xFrac: 0.52, yFrac: 0.64, rot: -5 },
  // ── 7 of Spades — bottom, face-down, left tilt ───────────────────────────
  { card: { id: 'curtain-4', suit: 'S', value: 7  } as CardType, faceDown: true,  golden: false, glowColor: '#a855f7', xFrac: 0.48, yFrac: 0.80, rot:  6 },
];

// Card face dimensions for `lg` size (matches Card.tsx SIZES map)
const CARD_W = 66;
const CARD_H = 92;

// ── Timing constants ─────────────────────────────────────────────────────────
const STAGGER_IN_MS   = 120;  // delay between each card rising in (top → bottom)
const MIDPOINT_MS     = 800;  // layout swap fires here (screen fully dark)
const STAGGER_OUT_MS  = 70;   // delay between each card exiting (bottom → top)
const DIMOUT_DELAY_MS = 280;  // wait after last card exits before lifting dim
const DIMOUT_DUR_MS   = 380;  // black dim fades back to transparent

// How far below its resting position each card starts before rising
const RISE_FROM_Y = 52;

interface OrientationCurtainProps {
  toDirection: 'landscape' | 'portrait';
  onMidpoint: () => void;
  onComplete: () => void;
}

/**
 * Column Rise orientation curtain.
 *
 * Cards are stacked in a vertical column down the screen centre.
 * Each card rises from below its resting position while scaling in,
 * creating a cinematic "cards dealt from below" feel.
 *
 * Timeline (~1 500 ms total):
 *   0–300 ms         Black overlay fades in (ease-out)
 *   0–720 ms         5 cards rise + scale in, staggered 120 ms each (top→bottom)
 *                    Each card: translateY +52→0 + scale 0→1.12→1.0 (spring)
 *   800 ms           onMidpoint fires → layout committed while screen is dark
 *   800–1 130 ms     Cards exit upward, staggered 70 ms each (bottom→top)
 *                    Each card: translateY 0→-40 + scale 1→0 (ease-in)
 *   1 130–1 510 ms   Black overlay fades out → onComplete fires via runOnJS
 *
 * pointerEvents="none" — curtain never intercepts user touches.
 */
export default function OrientationCurtain({
  onMidpoint,
  onComplete,
}: OrientationCurtainProps) {
  const { width: W, height: H } = useWindowDimensions();

  // ── Shared values ─────────────────────────────────────────────────────────
  const dimOpacity = useSharedValue(0);

  // Per-card scale (0 → 1) — hooks must be called individually
  const scale0 = useSharedValue(0);
  const scale1 = useSharedValue(0);
  const scale2 = useSharedValue(0);
  const scale3 = useSharedValue(0);
  const scale4 = useSharedValue(0);
  const scales = [scale0, scale1, scale2, scale3, scale4];

  // Per-card vertical offset — starts below resting position, springs to 0
  const ty0 = useSharedValue(RISE_FROM_Y);
  const ty1 = useSharedValue(RISE_FROM_Y);
  const ty2 = useSharedValue(RISE_FROM_Y);
  const ty3 = useSharedValue(RISE_FROM_Y);
  const ty4 = useSharedValue(RISE_FROM_Y);
  const tys = [ty0, ty1, ty2, ty3, ty4];

  // ── Animated styles ───────────────────────────────────────────────────────
  const dimStyle = useAnimatedStyle(() => ({ opacity: dimOpacity.value }));

  const cardStyle0 = useAnimatedStyle(() => ({ transform: [{ translateY: ty0.value }, { scale: scale0.value }] }));
  const cardStyle1 = useAnimatedStyle(() => ({ transform: [{ translateY: ty1.value }, { scale: scale1.value }] }));
  const cardStyle2 = useAnimatedStyle(() => ({ transform: [{ translateY: ty2.value }, { scale: scale2.value }] }));
  const cardStyle3 = useAnimatedStyle(() => ({ transform: [{ translateY: ty3.value }, { scale: scale3.value }] }));
  const cardStyle4 = useAnimatedStyle(() => ({ transform: [{ translateY: ty4.value }, { scale: scale4.value }] }));
  const cardStyles = [cardStyle0, cardStyle1, cardStyle2, cardStyle3, cardStyle4];

  useEffect(() => {
    // ── Dim in ────────────────────────────────────────────────────────────
    dimOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

    // ── Cards rise in (top → bottom stagger) ─────────────────────────────
    scales.forEach((s, i) => {
      s.value = withDelay(
        i * STAGGER_IN_MS,
        withSequence(
          withSpring(1.12, { damping: 11, stiffness: 240 }),
          withSpring(1.0,  { damping: 20, stiffness: 300 }),
        ),
      );
    });

    tys.forEach((ty, i) => {
      ty.value = withDelay(
        i * STAGGER_IN_MS,
        withSpring(0, { damping: 14, stiffness: 200 }),
      );
    });

    // ── Midpoint → exit upward → dim-out ─────────────────────────────────
    const midTimer = setTimeout(() => {
      onMidpoint();

      // Exit in reverse order: bottom card first, top card last
      scales.forEach((s, i) => {
        const reverseI = CURTAIN_CARDS.length - 1 - i;
        s.value = withDelay(
          reverseI * STAGGER_OUT_MS,
          withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
        );
      });

      tys.forEach((ty, i) => {
        const reverseI = CURTAIN_CARDS.length - 1 - i;
        ty.value = withDelay(
          reverseI * STAGGER_OUT_MS,
          withTiming(-44, { duration: 200, easing: Easing.in(Easing.quad) }),
        );
      });

      // After all cards have exited, lift the dim
      const lastCardExitMs = (CURTAIN_CARDS.length - 1) * STAGGER_OUT_MS + 200;
      dimOpacity.value = withDelay(
        lastCardExitMs + DIMOUT_DELAY_MS,
        withTiming(0, { duration: DIMOUT_DUR_MS, easing: Easing.in(Easing.quad) }, (finished) => {
          'worklet';
          if (finished) runOnJS(onComplete)();
        }),
      );
    }, MIDPOINT_MS);

    return () => {
      clearTimeout(midTimer);
      cancelAnimation(dimOpacity);
      scales.forEach((s) => cancelAnimation(s));
      tys.forEach((ty) => cancelAnimation(ty));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.overlay, dimStyle]}
      pointerEvents="none"
    >
      {CURTAIN_CARDS.map((def, i) => {
        const left = W * def.xFrac - CARD_W / 2;
        const top  = H * def.yFrac - CARD_H / 2;

        return (
          <Animated.View
            key={def.card.id}
            style={[
              styles.cardAnchor,
              { left, top },
              cardStyles[i],
            ]}
            pointerEvents="none"
          >
            {/* Glow halo behind the card */}
            <View
              style={[
                styles.glowHalo,
                {
                  shadowColor: def.golden ? '#f59e0b' : def.glowColor,
                  shadowOpacity: def.golden ? 1 : 0.85,
                  shadowRadius: def.golden ? 32 : 22,
                  backgroundColor: def.golden ? '#f59e0b22' : `${def.glowColor}18`,
                  transform: [{ rotate: `${def.rot}deg` }],
                },
              ]}
            />

            {/* Card itself, rotated */}
            <View style={{ transform: [{ rotate: `${def.rot}deg` }] }}>
              {def.golden ? (
                <View style={styles.goldenWrapper}>
                  {def.faceDown
                    ? <CardBack size="lg" />
                    : <CardComponent card={def.card} size="lg" disabled />
                  }
                </View>
              ) : def.faceDown ? (
                <CardBack size="lg" />
              ) : (
                <CardComponent card={def.card} size="lg" disabled />
              )}
            </View>
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#000000',
  },
  cardAnchor: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowHalo: {
    position: 'absolute',
    width: CARD_W + 24,
    height: CARD_H + 24,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  goldenWrapper: {
    borderRadius: 8,
    borderWidth: 2.5,
    borderColor: '#fbbf24',
    shadowColor: '#f59e0b',
    shadowOpacity: 1,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
});
