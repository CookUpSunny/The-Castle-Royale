import React, { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import CardComponent from '@/components/Card';
import { type Card as CardType } from '@/contexts/GameContext';

// ── Curtain card identities ────────────────────────────────────────────────
// Ace of Spades for portrait → landscape, 10 of Diamonds for landscape → portrait.
const ACE_OF_SPADES: CardType   = { id: 'curtain-ace-spades',    suit: 'S', value: 1  };
const TEN_OF_DIAMONDS: CardType = { id: 'curtain-ten-diamonds', suit: 'D', value: 10 };

// Dimensions of the `lg` size used by CardComponent (from Card.tsx SIZES map).
const CARD_LG_W = 66;
const CARD_LG_H = 92;

interface OrientationCurtainProps {
  toDirection: 'landscape' | 'portrait';
  onMidpoint: () => void;
  onComplete: () => void;
}

/**
 * Full-screen card curtain that masks the orientation layout swap.
 *
 * Two-layer architecture:
 *
 *   Layer 1 — opaque background (absoluteFill, white card colour #f8f4ff).
 *     A single composed withSequence animates opacity: 0 → 1 (300ms fade-in),
 *     then holds at 1 (1100ms while card crosses), then 1 → 0 (800ms fade-out).
 *     This guarantees 100 % opaque coverage for every frame while the curtain
 *     is active, hiding the old layout immediately and revealing the new one
 *     only as the background fades out at the end.
 *
 *   Layer 2 — oversized card face (2 × screenWidth × screenHeight).
 *     Uses the existing CardComponent (lg size: 66 × 92 px) and stretches it
 *     via scaleX / scaleY transforms to fill a 2 W × H container. Because the
 *     card face is twice the screen width, its leading edge always covers the
 *     full viewport during the crossing phase (tx ∈ [−W, 0]).
 *
 *     Ace of Spades  → toDirection = 'landscape'
 *     10 of Diamonds → toDirection = 'portrait'
 *
 * Animation timeline (~2 200 ms total):
 *   0 – 300 ms       background fades in  (opacity 0 → 1, ease-out)
 *   0 – 400 ms       card face enters fast (tx: −2W → −W, ease-out)
 *   400 – 1 400 ms   card face crosses slowly (tx: −W → 0, ease-in-out)
 *   900 ms           midpoint fires → layout committed behind opaque background
 *   1 400 – 1 800 ms card face exits fast  (tx: 0 → +W, ease-in)
 *   1 400 – 2 200 ms background fades out  (opacity 1 → 0, ease-in)
 *
 * pointerEvents="none" — curtain never intercepts touches.
 * Cleanup on unmount cancels all in-flight Reanimated animations + the midpoint
 * timer so rapid re-rotation (key bump in game.tsx) is safe.
 */
export default function OrientationCurtain({
  toDirection,
  onMidpoint,
  onComplete,
}: OrientationCurtainProps) {
  const { width: W, height: H } = useWindowDimensions();

  const bgOpacity      = useSharedValue(0);
  const cardTranslateX = useSharedValue(-2 * W);

  const card = toDirection === 'landscape' ? ACE_OF_SPADES : TEN_OF_DIAMONDS;

  // Scale factors to stretch the lg card to fill the 2W × H face container.
  const scaleX = (W * 2) / CARD_LG_W;
  const scaleY = H        / CARD_LG_H;

  const PHASE_ENTRY = 400;   // ms: fast entry
  const PHASE_CROSS = 1000;  // ms: slow crossing
  const PHASE_EXIT  = 400;   // ms: fast exit
  const FADE_IN     = 300;   // ms: bg fade-in (runs concurrently with entry)
  const FADE_HOLD   = PHASE_ENTRY + PHASE_CROSS - FADE_IN; // ms: hold at full opacity
  const FADE_OUT    = 800;   // ms: bg fade-out (starts when card begins exiting)

  const MIDPOINT_MS = PHASE_ENTRY + PHASE_CROSS / 2; // 900ms

  useEffect(() => {
    // ── Background: single composed sequence — no double-assignment risk ──
    // fade-in → hold at 1 → fade-out → call onComplete from worklet callback.
    bgOpacity.value = withSequence(
      withTiming(1, { duration: FADE_IN, easing: Easing.out(Easing.quad) }),
      withDelay(
        FADE_HOLD,
        withTiming(0, { duration: FADE_OUT, easing: Easing.in(Easing.quad) }, (finished) => {
          'worklet';
          if (finished) runOnJS(onComplete)();
        }),
      ),
    );

    // ── Card face: fast entry → slow cross → fast exit ────────────────────
    cardTranslateX.value = -2 * W;
    cardTranslateX.value = withSequence(
      withTiming(-W, { duration: PHASE_ENTRY, easing: Easing.out(Easing.cubic) }),
      withTiming(0,  { duration: PHASE_CROSS, easing: Easing.inOut(Easing.quad) }),
      withTiming(W,  { duration: PHASE_EXIT,  easing: Easing.in(Easing.cubic) }),
    );

    // ── Midpoint: called directly from the JS timer (no runOnJS needed here
    //    since setTimeout callbacks already run on the JS thread).
    const midTimer = setTimeout(() => {
      onMidpoint();
    }, MIDPOINT_MS);

    return () => {
      clearTimeout(midTimer);
      cancelAnimation(bgOpacity);
      cancelAnimation(cardTranslateX);
    };
  }, []);

  return (
    // ── Layer 1: opaque background ────────────────────────────────────────
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.bg, { opacity: bgOpacity }]}
      pointerEvents="none"
    >
      {/* ── Layer 2: oversized card face that sweeps across ──────────────── */}
      <Animated.View
        style={[
          styles.cardWrapper,
          { width: W * 2, height: H, transform: [{ translateX: cardTranslateX }] },
        ]}
        pointerEvents="none"
      >
        {/*
         * CardComponent (lg: 66 × 92) is scaled with scaleX / scaleY transforms
         * to visually fill the 2W × H container. overflow: 'hidden' on the
         * wrapper clips any rounding artefacts at the edges.
         */}
        <View
          style={{
            width: CARD_LG_W,
            height: CARD_LG_H,
            transform: [{ scaleX }, { scaleY }],
          }}
        >
          <CardComponent card={card} size="lg" disabled />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: {
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#f8f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
