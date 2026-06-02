import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { type Card as CardType } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import CardComponent, { CardBack } from './Card';


interface FaceDownRevealProps {
  /** The card that was revealed from the blind row. */
  card: CardType;
  /** The card that was on top of the pile BEFORE the reveal (what the player had to beat). Null when the pile was empty. */
  topCard?: CardType | null;
  /** Whether the play busted (couldn't land on pile, player picks up). */
  busted: boolean;
  /** Player display name for the headline ("YOU REVEAL..." vs "<NAME> REVEALS..."). */
  who: string;
  /** Fires once the animation finishes so the parent can unmount. */
  onComplete: () => void;
}

/**
 * Hyperfocused full-screen overlay that animates the reveal of a face-down
 * blind card directly against the top of the discard pile. The reveal card
 * flips in next to the pile-top card so the comparison is unmistakable, then
 * a giant verdict banner declares "LANDS!" or "BUSTED!" — making it impossible
 * to miss the moment, even if it ends in a forced pickup.
 *
 * Sequence:
 *   0ms      mount, dimmed backdrop fades in
 *   200ms    pile-top card slides up from the left, face-down card pops in on the right
 *   400ms    face-down card starts flipping (rotateY: 0 → 90 → 180), back swaps to face at 90°
 *   ~1100ms  flip complete, verdict banner crashes in (BUST = red, LAND = gold)
 *   ~2400ms  fade out + onComplete()
 */
export default function FaceDownReveal({ card, topCard, busted, who, onComplete }: FaceDownRevealProps) {
  const colors = useColors();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const flip = useSharedValue(0); // 0 → 1 over the flip duration
  const overlayOpacity = useSharedValue(0);
  const verdictOpacity = useSharedValue(0);
  const verdictScale = useSharedValue(0.6);
  const pileSlide = useSharedValue(-40);
  const pileOpacity = useSharedValue(0);
  const revealEnter = useSharedValue(20);
  const revealOpacity = useSharedValue(0);
  const vsScale = useSharedValue(0);
  const [showFront, setShowFront] = useState(false);

  useEffect(() => {
    overlayOpacity.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
      withDelay(2000, withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) })),
    );

    // Pile-top card slides up from the left and lands.
    pileOpacity.value = withDelay(180, withTiming(1, { duration: 280 }));
    pileSlide.value = withDelay(180, withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) }));

    // Reveal card pops in on the right.
    revealOpacity.value = withDelay(220, withTiming(1, { duration: 220 }));
    revealEnter.value = withDelay(220, withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }));

    // VS divider scales in between them.
    vsScale.value = withDelay(420, withTiming(1, { duration: 240, easing: Easing.out(Easing.back(2)) }));

    // The flip itself — kicks off after both cards are in position.
    flip.value = withDelay(420, withTiming(1, { duration: 700, easing: Easing.inOut(Easing.cubic) }));

    // Swap card-back for card-front mid-flip (when the card is edge-on).
    const swapTimer = setTimeout(() => setShowFront(true), 420 + 350);

    // Verdict banner — bigger and more impactful than the old "caption".
    verdictOpacity.value = withDelay(
      1180,
      withSequence(
        withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) }),
        withDelay(1000, withTiming(0, { duration: 280 })),
      ),
    );
    verdictScale.value = withDelay(
      1180,
      withSequence(
        withTiming(1.15, { duration: 240, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.quad) }),
      ),
    );

    const completeTimer = setTimeout(() => onCompleteRef.current(), 2580);

    return () => {
      clearTimeout(swapTimer);
      clearTimeout(completeTimer);
      cancelAnimation(flip);
      cancelAnimation(overlayOpacity);
      cancelAnimation(verdictOpacity);
      cancelAnimation(verdictScale);
      cancelAnimation(pileSlide);
      cancelAnimation(pileOpacity);
      cancelAnimation(revealEnter);
      cancelAnimation(revealOpacity);
      cancelAnimation(vsScale);
    };
  }, [flip, overlayOpacity, verdictOpacity, verdictScale, pileSlide, pileOpacity, revealEnter, revealOpacity, vsScale]);

  // ScaleX-based flip — the card horizontally squeezes to a vertical line at
  // the midpoint, swaps face↔back, then expands back to full width. This
  // avoids the iOS backfaceVisibility quirk that hid the revealed card when
  // we tried a true 3D rotateY flip with a nested counter-rotation: iOS
  // computes backface visibility against the immediate transform (not the
  // cumulative scene rotation), so the inner element's own 180° rotation
  // would silently cull the entire front face.
  const cardStyle = useAnimatedStyle(() => {
    const t = flip.value; // 0 → 1
    // cos(πt) goes 1 → -1, abs makes it "bounce" through 0 at the midpoint.
    const rawSx = Math.cos(t * Math.PI);
    // Floor at a tiny non-zero to keep the layer rendered (avoids subpixel cull).
    const scaleX = Math.max(Math.abs(rawSx), 0.02);
    // Subtle bulge on the Y axis so it feels like the card "presents" itself.
    const scaleY = 1 + Math.sin(t * Math.PI) * 0.18;
    return {
      transform: [
        { translateY: revealEnter.value },
        { scaleX },
        { scaleY },
      ],
      opacity: revealOpacity.value,
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const verdictStyle = useAnimatedStyle(() => ({
    opacity: verdictOpacity.value,
    transform: [{ scale: verdictScale.value }],
  }));
  const pileStyle = useAnimatedStyle(() => ({
    opacity: pileOpacity.value,
    transform: [{ translateY: pileSlide.value }],
  }));
  const vsStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vsScale.value }],
  }));

  const verdictColor = busted ? '#ef4444' : '#fde047';
  const verdictBgColors: [string, string, string] = busted
    ? ['#7f1d1d', '#450a0a', '#1c0606']
    : ['#a16207', '#451a03', '#1a0a01'];
  const verdictMain = busted ? 'BUSTED' : 'LANDS!';
  const verdictSub = busted ? 'TAKE THE PILE · PLAY A STARTER' : 'CARD STAYS ON THE PILE';
  const verdictIcon = busted ? '💥' : '⚡';

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
      <View style={styles.backdrop} />

      <Text style={[styles.headline, { color: colors.neonGold }]}>
        {who.toUpperCase()} REVEALS...
      </Text>

      <View style={styles.compareRow}>
        {/* Pile-top card on the left — what the reveal had to beat. */}
        <Animated.View style={[styles.pileSide, pileStyle]}>
          {topCard ? (
            <>
              <Text style={[styles.sideLabel, { color: '#94a3b8' }]}>MUST BEAT</Text>
              <View style={styles.pileGlow}>
                <CardComponent card={topCard} size="lg" />
              </View>
              <Text style={[styles.sideValue, { color: '#cbd5e1' }]}>
                {labelFor(topCard.value)}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.sideLabel, { color: '#94a3b8' }]}>EMPTY PILE</Text>
              <View style={[styles.emptySlot]}>
                <Text style={styles.emptySlotText}>—</Text>
              </View>
              <Text style={[styles.sideValue, { color: '#cbd5e1' }]}>FREE</Text>
            </>
          )}
        </Animated.View>

        <Animated.View style={[styles.vsBadge, vsStyle]}>
          {/* Amber glow halo — separate View so no elevation is needed on the
              transparent Animated.View wrapper (which causes a black rectangle
              on Android). iOS shadow works because the glow has a background. */}
          <View style={styles.vsGlowRing} />
          <LinearGradient
            colors={['#fbbf24', '#b45309']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.vsBadgeInner}
          >
            <Text style={styles.vsText}>VS</Text>
          </LinearGradient>
        </Animated.View>

        {/* Reveal card on the right — flips from card-back to card-front. */}
        <View style={styles.revealSide}>
          <Text style={[styles.sideLabel, { color: colors.neonGold }]}>YOUR REVEAL</Text>
          <Animated.View style={[styles.cardWrap, cardStyle]}>
            {showFront ? <CardComponent card={card} size="lg" /> : <CardBack size="lg" />}
          </Animated.View>
          <Text style={[styles.sideValue, { color: showFront ? colors.neonGold : '#64748b' }]}>
            {showFront ? labelFor(card.value) : '???'}
          </Text>
        </View>
      </View>

      <Animated.View style={[styles.verdictWrap, verdictStyle]}>
        <LinearGradient colors={verdictBgColors} style={styles.verdictInner}>
          <Text style={[styles.verdictIcon]}>{verdictIcon}</Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.verdictMain, { color: verdictColor }]}>{verdictMain}</Text>
            <Text style={[styles.verdictSub, { color: '#fde68a' }]}>{verdictSub}</Text>
          </View>
          <Text style={[styles.verdictIcon]}>{verdictIcon}</Text>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

function labelFor(value: number): string {
  if (value === 11) return 'J';
  if (value === 12) return 'Q';
  if (value === 13) return 'K';
  if (value === 14) return 'A';
  return String(value);
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2,0,10,0.86)',
  },
  headline: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: 22,
    textShadowColor: 'rgba(255,215,0,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  compareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pileSide: {
    alignItems: 'center',
    gap: 6,
  },
  revealSide: {
    alignItems: 'center',
    gap: 6,
  },
  sideLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.5,
  },
  sideValue: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  pileGlow: {
    shadowColor: '#94a3b8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  emptySlot: {
    width: 64,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotText: {
    fontSize: 28,
    color: 'rgba(148,163,184,0.7)',
    fontWeight: '900',
  },
  vsBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsGlowRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fbbf2430',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    // elevation intentionally omitted — adding elevation to a transparent-bg
    // View on Android renders a black drop-shadow rectangle. The iOS shadow
    // is sufficient; Android gets the amber backgroundColor halo instead.
  },
  vsBadgeInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fde047',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 12,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#1a0535',
  },
  cardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 32,
    elevation: 20,
  },
  verdictWrap: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 12,
  },
  verdictInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  verdictIcon: {
    fontSize: 28,
  },
  verdictMain: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  verdictSub: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginTop: 2,
  },
});
