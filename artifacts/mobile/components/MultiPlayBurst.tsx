import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { type Card as CardType } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import CardComponent from './Card';

interface MultiPlayBurstProps {
  card: CardType;
  count: number; // number of same-value cards played in one move (≥ 2)
  who: string; // "YOU" or opponent name
  onComplete: () => void;
}

const TAG_FOR_COUNT: Record<number, string> = {
  2: 'DOUBLE',
  3: 'TRIPLE',
  4: 'QUAD',
};

function taglineForCount(count: number): string {
  return TAG_FOR_COUNT[count] ?? `${count}-CARD`;
}

/**
 * Cinematic banner when a player commits two or more same-value cards in one
 * move. The cards fan into the center, a large xN label pops in with a pulse,
 * then everything floats away. Visible to both players.
 *
 * Lifecycle: ~1700ms total
 *   0–250ms   cards fly in, fan out
 *   250–1100ms banner crashes in + xN pulse
 *   1100–1700ms fade + drift up, then onComplete
 */
export default function MultiPlayBurst({ card, count, who, onComplete }: MultiPlayBurstProps) {
  const colors = useColors();
  const safeCount = Math.max(2, count);
  const haptic = Haptics.NotificationFeedbackType.Success;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const cardsScale = useSharedValue(0.3);
  const cardsOpacity = useSharedValue(0);
  const cardsY = useSharedValue(40);

  const bannerScale = useSharedValue(0.4);
  const bannerOpacity = useSharedValue(0);
  const bannerY = useSharedValue(0);
  const multPop = useSharedValue(0.85);

  const flash = useSharedValue(0);

  const fanCount = Math.min(safeCount, 4);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(haptic).catch(() => {});
      if (safeCount >= 3) {
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
      }
      if (safeCount >= 4) {
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 380);
      }
    }

    // Cards fly in
    cardsOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    cardsScale.value = withSequence(
      withTiming(1.15, { duration: 280, easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1, { duration: 160 }),
    );
    cardsY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });

    // Banner crash
    bannerOpacity.value = withDelay(220, withTiming(1, { duration: 180 }));
    bannerScale.value = withDelay(
      220,
      withSequence(
        withTiming(1.18, { duration: 220, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 160 }),
      ),
    );

    multPop.value = withDelay(
      200,
      withSequence(
        withTiming(1.28, { duration: 260, easing: Easing.out(Easing.back(1.8)) }),
        withTiming(1, { duration: 220 }),
        withRepeat(
          withSequence(withTiming(1.06, { duration: 320 }), withTiming(1, { duration: 320 })),
          2,
          false,
        ),
      ),
    );

    // Screen flash (stronger for higher multiples)
    const flashPeak = safeCount === 2 ? 0.18 : safeCount === 3 ? 0.32 : 0.5;
    flash.value = withSequence(
      withTiming(flashPeak, { duration: 120, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 380, easing: Easing.in(Easing.cubic) }),
    );

    // Fade out + drift up, then signal completion
    cardsOpacity.value = withDelay(1100, withTiming(0, { duration: 500 }));
    bannerOpacity.value = withDelay(1100, withTiming(0, { duration: 500 }));
    bannerY.value = withDelay(1100, withTiming(-40, { duration: 500, easing: Easing.in(Easing.cubic) }));

    // Drive unmount from a JS-thread timer rather than a worklet completion
    // callback. The previous `runOnJS(() => onCompleteRef.current())()` form
    // created an inline arrow inside the worklet, which is brittle and can
    // skip onComplete entirely — leaving the overlay mounted, which then
    // accumulates animation work as new bursts arrive.
    const completeTimer = setTimeout(() => onCompleteRef.current(), 1700);
    return () => clearTimeout(completeTimer);
  }, [
    safeCount,
    haptic,
    cardsOpacity,
    cardsScale,
    cardsY,
    bannerOpacity,
    bannerScale,
    bannerY,
    multPop,
    flash,
  ]);

  const cardsContainerStyle = useAnimatedStyle(() => ({
    opacity: cardsOpacity.value,
    transform: [{ scale: cardsScale.value }, { translateY: cardsY.value }],
  }));

  const bannerStyle = useAnimatedStyle(() => ({
    opacity: bannerOpacity.value,
    transform: [{ scale: bannerScale.value }, { translateY: bannerY.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  const multPopStyle = useAnimatedStyle(() => ({
    transform: [{ scale: multPop.value }],
  }));

  // Color theme escalates with the multiple.
  const accent =
    safeCount >= 4 ? colors.neonOrange : safeCount === 3 ? colors.neonGold : colors.electric;

  // Fan the cards out symmetrically. Cards overlap so the fan is compact.
  const fanSpread = fanCount === 2 ? 22 : fanCount === 3 ? 30 : 38;
  const fanItems = Array.from({ length: fanCount });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Subtle radial flash */}
      <Animated.View style={[StyleSheet.absoluteFill, flashStyle, { backgroundColor: accent }]} />

      <View style={styles.center}>
        {/* Card fan */}
        <Animated.View style={[styles.fan, cardsContainerStyle]}>
          {fanItems.map((_, i) => {
            const offsetIndex = i - (fanCount - 1) / 2;
            const rotate = `${offsetIndex * fanSpread * 0.25}deg`;
            const translateX = offsetIndex * fanSpread;
            const translateY = Math.abs(offsetIndex) * 4;
            return (
              <View
                key={i}
                style={[
                  styles.fanCard,
                  {
                    transform: [
                      { translateX },
                      { translateY },
                      { rotate },
                    ],
                    shadowColor: accent,
                  },
                ]}
              >
                <CardComponent card={card} size="lg" />
              </View>
            );
          })}
        </Animated.View>

        {/* Banner */}
        <Animated.View style={[styles.bannerWrap, bannerStyle]}>
          <LinearGradient
            colors={[`${accent}10`, `${accent}40`, `${accent}10`]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.bannerBg, { borderColor: accent, shadowColor: accent }]}
          >
            <Animated.View style={multPopStyle}>
              <Text style={[styles.bannerMult, { color: accent, textShadowColor: accent }]}>
                x{safeCount}
              </Text>
            </Animated.View>
            <Text style={[styles.bannerTag, { color: colors.foreground }]}>
              {taglineForCount(safeCount)} · {who}
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: 24,
  },
  fanCard: {
    position: 'absolute',
    shadowOpacity: 0.95,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  bannerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBg: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    shadowOpacity: 0.9,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  bannerMult: {
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
  },
  bannerTag: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 3,
    marginTop: 2,
    opacity: 0.88,
  },
});
