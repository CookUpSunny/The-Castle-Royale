import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

export type CastleTier = 'top' | 'bottom';

interface CastleReachedOverlayProps {
  /** Which milestone triggered this overlay. */
  tier: CastleTier;
  /** Display name of the player who reached the milestone (e.g. "YOU" / opponent name). */
  who: string;
  /** Whether the local player is the one who reached the milestone. */
  isMine: boolean;
  /** Called once the overlay finishes its full animation. */
  onComplete: () => void;
}

interface ConfettiSpec {
  id: number;
  startAngle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
  spin: number;
}

/**
 * Big mid-game celebration banner that fires when a player drains a
 * castle layer (hand → top castle, face-up → bottom castle). Shown to
 * both players simultaneously so the moment lands as a shared beat
 * regardless of POV.
 *
 * Composition:
 *   • full-screen radial flash (gold for top, jackpot rainbow for bottom)
 *   • coin / chip confetti spraying outward from center
 *   • scaling banner with two-line copy ("TOP CASTLE" / "FINAL CASTLE")
 *
 * Lifetime ~2.0s (top) / 2.4s (bottom). Self-unmounts via onComplete.
 */
export default function CastleReachedOverlay({
  tier,
  who,
  isMine,
  onComplete,
}: CastleReachedOverlayProps) {
  const colors = useColors();
  const isFinal = tier === 'bottom';
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const flash = useSharedValue(0);
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const bannerScale = useSharedValue(0.4);
  const bannerOpacity = useSharedValue(0);
  const bannerY = useSharedValue(8);
  const subOpacity = useSharedValue(0);

  const totalDuration = isFinal ? 2400 : 2000;

  // Confetti / spark particles fanning out from center. Pre-computed so
  // the layout is stable once mounted; randomness is captured in useMemo
  // and never re-rolled on re-render.
  const confetti = useMemo<ConfettiSpec[]>(() => {
    const palette = isFinal
      ? ['#ffd700', '#fff1a8', '#00e5ff', '#c084fc', '#ff7f00', '#ffffff']
      : ['#ffd700', '#ffb347', '#ff7f00', '#fff1a8', '#ffffff'];
    const count = isFinal ? 28 : 20;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      startAngle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4,
      distance: 130 + Math.random() * (isFinal ? 220 : 150),
      size: 8 + Math.random() * (isFinal ? 14 : 8),
      color: palette[i % palette.length]!,
      delay: Math.random() * 120,
      spin: (Math.random() - 0.5) * 720,
    }));
  }, [isFinal]);

  useEffect(() => {
    // Radial flash — quick punch then fade.
    const flashPeak = isFinal ? 0.55 : 0.35;
    flash.value = withSequence(
      withTiming(flashPeak, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 720, easing: Easing.in(Easing.cubic) }),
    );

    // Outward ring expanding.
    ringOpacity.value = withSequence(
      withTiming(1, { duration: 80 }),
      withDelay(220, withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) })),
    );
    ringScale.value = withTiming(isFinal ? 3.2 : 2.4, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });

    // Banner crash + bounce + drift up.
    bannerOpacity.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withDelay(totalDuration - 800, withTiming(0, { duration: 500 })),
    );
    bannerScale.value = withSequence(
      withTiming(1.18, { duration: 240, easing: Easing.out(Easing.back(2.2)) }),
      withTiming(1, { duration: 180 }),
      withDelay(totalDuration - 1100, withTiming(0.96, { duration: 500 })),
    );
    bannerY.value = withSequence(
      withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withDelay(totalDuration - 800, withTiming(-30, { duration: 500, easing: Easing.in(Easing.cubic) })),
    );

    subOpacity.value = withDelay(
      300,
      withSequence(
        withTiming(1, { duration: 220 }),
        withDelay(totalDuration - 1100, withTiming(0, { duration: 360 })),
      ),
    );

    const t = setTimeout(() => onCompleteRef.current(), totalDuration);
    return () => clearTimeout(t);
  }, [
    isFinal,
    totalDuration,
    flash,
    ringOpacity,
    ringScale,
    bannerOpacity,
    bannerScale,
    bannerY,
    subOpacity,
  ]);

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));
  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ scale: bannerScale.value }, { translateY: bannerY.value }],
  }));
  const subStyle = useAnimatedStyle(() => ({ opacity: subOpacity.value }));

  const accent = isFinal ? colors.neonGold : colors.neonGold;
  const flashColor = isFinal ? '#ffd700' : '#ffd70080';
  const headline = isFinal ? 'FINAL CASTLE' : 'TOP CASTLE';
  const sub = isFinal
    ? `${who} • Down to the wire`
    : `${who} • One layer to go`;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View style={[StyleSheet.absoluteFill, flashStyle, { backgroundColor: flashColor }]} />

      <View style={styles.center} pointerEvents="none">
        {/* Outward gold ring */}
        <Animated.View style={[styles.ring, ringStyle, { borderColor: accent, shadowColor: accent }]} />

        {/* Confetti / spark fan */}
        {confetti.map((c) => (
          <ConfettiParticle key={c.id} spec={c} totalDuration={totalDuration} />
        ))}

        {/* Banner */}
        <Animated.View style={[styles.bannerWrap, bannerStyle]}>
          <LinearGradient
            colors={
              isFinal
                ? ['#ffd70015', '#ffd70055', '#ff7f0030', '#ffd70015']
                : ['#ffd70010', '#ffd70040', '#ffd70010']
            }
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.bannerBg, { borderColor: accent, shadowColor: accent }]}
          >
            <Text style={[styles.label, { color: '#fff1a8' }]}>
              {isFinal ? '✦ JACKPOT MOMENT ✦' : '✦ MILESTONE ✦'}
            </Text>
            <Text
              style={[
                styles.headline,
                {
                  color: accent,
                  textShadowColor: accent,
                  fontSize: isFinal ? 44 : 36,
                },
              ]}
            >
              {headline}
            </Text>
            <Animated.Text
              style={[
                styles.sub,
                { color: isMine ? colors.neonGold : colors.foreground },
                subStyle,
              ]}
            >
              {sub}
            </Animated.Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

interface ConfettiParticleProps {
  spec: ConfettiSpec;
  totalDuration: number;
}

function ConfettiParticle({ spec, totalDuration }: ConfettiParticleProps) {
  const t = useSharedValue(0);
  const op = useSharedValue(0);

  useEffect(() => {
    op.value = withDelay(spec.delay, withTiming(1, { duration: 80 }));
    t.value = withDelay(
      spec.delay,
      withTiming(1, { duration: totalDuration - 600 - spec.delay, easing: Easing.out(Easing.cubic) }),
    );
    op.value = withDelay(
      totalDuration - 600,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.cubic) }),
    );
  }, [spec, totalDuration, t, op]);

  const style = useAnimatedStyle(() => {
    const dx = Math.cos(spec.startAngle) * spec.distance * t.value;
    const dy = Math.sin(spec.startAngle) * spec.distance * t.value
      // gentle gravity tug pulling sparks downward later in the arc
      + 18 * t.value * t.value;
    const scale = 0.5 + t.value * 0.7;
    return {
      opacity: op.value,
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotate: `${spec.spin * t.value}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          width: spec.size,
          height: spec.size,
          backgroundColor: spec.color,
          shadowColor: spec.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 200,
    elevation: 30,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    shadowOpacity: 0.95,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  bannerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBg: {
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    shadowOpacity: 0.95,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 4,
    marginBottom: 6,
  },
  headline: {
    fontWeight: '900',
    letterSpacing: 4,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  sub: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    opacity: 0.9,
  },
  confetti: {
    position: 'absolute',
    borderRadius: 3,
    shadowOpacity: 0.85,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
});
