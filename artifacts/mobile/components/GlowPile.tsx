import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { type Card as CardType } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import Card from './Card';

interface GlowPileProps {
  pile: CardType[];
  lastEventType?: string;
}

export default function GlowPile({ pile, lastEventType }: GlowPileProps) {
  const colors = useColors();
  const ring1Scale = useSharedValue(1);
  const ring2Scale = useSharedValue(1);
  const ring3Scale = useSharedValue(1);
  const burnOpacity = useSharedValue(0);
  const topCard: CardType | undefined = pile[pile.length - 1];

  useEffect(() => {
    ring1Scale.value = withRepeat(
      withSequence(withTiming(1.12, { duration: 1800 }), withTiming(1.0, { duration: 1800 })),
      -1,
      false,
    );
    ring2Scale.value = withRepeat(
      withSequence(withTiming(1.18, { duration: 2400 }), withTiming(1.0, { duration: 2400 })),
      -1,
      false,
    );
    ring3Scale.value = withRepeat(
      withSequence(withTiming(1.25, { duration: 3000 }), withTiming(1.0, { duration: 3000 })),
      -1,
      false,
    );
  }, [ring1Scale, ring2Scale, ring3Scale]);

  useEffect(() => {
    if (lastEventType === 'burn' || lastEventType === 'set_complete') {
      burnOpacity.value = withSequence(
        withTiming(1, { duration: 150 }),
        withTiming(0, { duration: 700 }),
      );
    }
  }, [lastEventType, burnOpacity]);

  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }] }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }] }));
  const ring3Style = useAnimatedStyle(() => ({ transform: [{ scale: ring3Scale.value }] }));
  const burnStyle = useAnimatedStyle(() => ({ opacity: burnOpacity.value }));

  let glowColor = '#f5a623';
  if (topCard?.value === 2) glowColor = '#c084fc';
  if (topCard?.value === 10) glowColor = '#ff7f00';

  return (
    <View style={styles.wrap}>
      <View style={styles.center}>
        <Animated.View style={[styles.ringOuter, ring3Style]}>
          <LinearGradient
            colors={[`${glowColor}00`, `${glowColor}30`, `${glowColor}00`]}
            style={styles.ringFill}
          />
        </Animated.View>
        <Animated.View style={[styles.ringMid, ring2Style]}>
          <LinearGradient
            colors={[`${glowColor}10`, `${glowColor}50`, `${glowColor}10`]}
            style={styles.ringFill}
          />
        </Animated.View>
        <Animated.View style={[styles.ringInner, ring1Style]}>
          <LinearGradient
            colors={[`${glowColor}30`, `${glowColor}80`, `${glowColor}30`]}
            style={styles.ringFill}
          />
        </Animated.View>

        {topCard ? (
          <View style={styles.cardWrap}>
            <Card card={topCard} size="md" />
          </View>
        ) : (
          <View style={[styles.emptyPile, { borderColor: colors.border }]}>
            <Text style={{ color: colors.mutedForeground, fontSize: 22 }}>✦</Text>
          </View>
        )}

        <Animated.View style={[styles.burnFlash, burnStyle]} pointerEvents="none">
          <LinearGradient
            colors={['#ff7f00cc', '#ff000080', 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      {pile.length > 0 && (
        <Text style={[styles.pileCount, { color: colors.mutedForeground }]}>
          {pile.length} {pile.length === 1 ? 'card' : 'cards'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringFill: {
    flex: 1,
    borderRadius: 999,
  },
  ringOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: '#f5a62330',
    overflow: 'hidden',
  },
  ringMid: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: '#f5a62360',
    overflow: 'hidden',
  },
  ringInner: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#f5a62390',
    overflow: 'hidden',
  },
  cardWrap: {
    zIndex: 5,
  },
  emptyPile: {
    width: 56,
    height: 78,
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  burnFlash: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: 'hidden',
  },
  pileCount: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
