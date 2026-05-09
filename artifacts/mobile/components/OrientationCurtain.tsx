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
// 5-card spread: 3 face-up, 2 face-down; index 0 is the golden card.
interface CurtainCardDef {
  card: CardType;
  faceDown: boolean;
  golden: boolean;
  glowColor: string;
  // Position as fraction of screen dimensions (card centre)
  xFrac: number;
  yFrac: number;
  // Rotation in degrees (applied as CSS-style string)
  rot: number;
}

const CURTAIN_CARDS: CurtainCardDef[] = [
  // ── Golden Ace of Spades — screen centre, slight left tilt ────────────────
  { card: { id: 'curtain-0', suit: 'S', value: 1  } as CardType, faceDown: false, golden: true,  glowColor: '#f59e0b', xFrac: 0.50, yFrac: 0.50, rot: -6  },
  // ── King of Hearts — upper-left, sharp left tilt ─────────────────────────
  { card: { id: 'curtain-1', suit: 'H', value: 13 } as CardType, faceDown: false, golden: false, glowColor: '#ef4444', xFrac: 0.22, yFrac: 0.30, rot: -18 },
  // ── Queen of Diamonds — lower-right, right tilt ───────────────────────────
  { card: { id: 'curtain-2', suit: 'D', value: 12 } as CardType, faceDown: false, golden: false, glowColor: '#f97316', xFrac: 0.82, yFrac: 0.65, rot: 14  },
  // ── 10 of Clubs — upper-right, face-down ──────────────────────────────────
  { card: { id: 'curtain-3', suit: 'C', value: 10 } as CardType, faceDown: true,  golden: false, glowColor: '#a855f7', xFrac: 0.80, yFrac: 0.27, rot: 10  },
  // ── 7 of Spades — lower-left, face-down ───────────────────────────────────
  { card: { id: 'curtain-4', suit: 'S', value: 7  } as CardType, faceDown: true,  golden: false, glowColor: '#a855f7', xFrac: 0.24, yFrac: 0.72, rot: -12 },
];

// Card face dimensions for `lg` size (matches Card.tsx SIZES map)
const CARD_W = 66;
const CARD_H = 92;

// ── Timing constants ─────────────────────────────────────────────────────────
const STAGGER_IN_MS   = 80;   // delay between each card popping in
const MIDPOINT_MS     = 700;  // layout swap fires here (screen fully dark)
const STAGGER_OUT_MS  = 55;   // delay between each card popping out
const DIMOUT_DELAY_MS = 300;  // wait after last card exits before lifting dim
const DIMOUT_DUR_MS   = 350;  // black dim fades back to transparent

interface OrientationCurtainProps {
  toDirection: 'landscape' | 'portrait';
  onMidpoint: () => void;
  onComplete: () => void;
}

/**
 * Cascade Pop-In orientation curtain.
 *
 * Timeline (~1 410 ms total):
 *   0–300 ms         Black overlay fades in (ease-out)
 *   0–480 ms         5 cards pop in, staggered 80 ms each
 *                    Each card: scale 0 → 1.15 (spring overshoot) → 1.0
 *   700 ms           onMidpoint fires → layout committed while screen is dark;
 *                    card pop-out begins immediately (reverse stagger, 55 ms apart)
 *   700–975 ms       Cards exit (5 × 55 ms stagger + 180 ms each)
 *   1 060–1 410 ms   Black overlay fades out → onComplete fires via runOnJS
 *
 * `toDirection` is accepted for API compatibility with game.tsx (callers always
 * pass it) but does not currently influence which cards are shown — all rotations
 * use the same 5-card spread. Extend this prop if direction-specific art is added.
 *
 * pointerEvents="none" throughout — curtain never intercepts user touches.
 * Cleanup on unmount cancels all animations + the midpoint timer.
 */
export default function OrientationCurtain({
  onMidpoint,
  onComplete,
}: OrientationCurtainProps) {
  const { width: W, height: H } = useWindowDimensions();

  // ── Shared values ─────────────────────────────────────────────────────────
  const dimOpacity = useSharedValue(0);

  // Five card scales — must be declared individually (hooks rule)
  const scale0 = useSharedValue(0);
  const scale1 = useSharedValue(0);
  const scale2 = useSharedValue(0);
  const scale3 = useSharedValue(0);
  const scale4 = useSharedValue(0);
  const scales = [scale0, scale1, scale2, scale3, scale4];

  // ── Animated styles ───────────────────────────────────────────────────────
  const dimStyle   = useAnimatedStyle(() => ({ opacity: dimOpacity.value }));
  const cardStyle0 = useAnimatedStyle(() => ({ transform: [{ scale: scale0.value }] }));
  const cardStyle1 = useAnimatedStyle(() => ({ transform: [{ scale: scale1.value }] }));
  const cardStyle2 = useAnimatedStyle(() => ({ transform: [{ scale: scale2.value }] }));
  const cardStyle3 = useAnimatedStyle(() => ({ transform: [{ scale: scale3.value }] }));
  const cardStyle4 = useAnimatedStyle(() => ({ transform: [{ scale: scale4.value }] }));
  const cardStyles = [cardStyle0, cardStyle1, cardStyle2, cardStyle3, cardStyle4];

  useEffect(() => {
    // ── Dim in ────────────────────────────────────────────────────────────
    dimOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

    // ── Cards pop in (staggered) ──────────────────────────────────────────
    scales.forEach((s, i) => {
      s.value = withDelay(
        i * STAGGER_IN_MS,
        withSequence(
          withSpring(1.15, { damping: 10, stiffness: 260 }),
          withSpring(1.0,  { damping: 18, stiffness: 320 }),
        ),
      );
    });

    // ── Midpoint → pop-out → dim-out ──────────────────────────────────────
    const midTimer = setTimeout(() => {
      onMidpoint();

      // Cards pop out in reverse order (last card pops out first → cascade feel)
      scales.forEach((s, i) => {
        const reverseI = CURTAIN_CARDS.length - 1 - i;
        s.value = withDelay(
          reverseI * STAGGER_OUT_MS,
          withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
        );
      });

      // After all cards have exited, lift the dim
      const lastCardExitMs = (CURTAIN_CARDS.length - 1) * STAGGER_OUT_MS + 180;
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
                // Golden Ace: extra gold border + intense amber glow wrapper
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
    // Origin is top-left corner of the card; width/height kept at card size
    // so rotate transform pivots around the card centre correctly.
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
