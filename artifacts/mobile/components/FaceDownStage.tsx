import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import CardComponent from './Card';

interface FaceDownStageProps {
  faceDownIds: string[];
  isMyTurn: boolean;
  onPlayCard: (cardId: string) => void;
}

/**
 * The player's final face-down cards.
 *
 * Cards are stationary (so they're easy to tap) but each one has its own
 * pulsing golden aura on a staggered timeline so the row still feels alive
 * and dramatic. Tapping a card fires onPlayCard which kicks off the
 * server-side blind play and the FaceDownReveal flip animation.
 */
function AnimatedFaceDownCard({
  index,
  cardId,
  enabled,
  onPress,
}: {
  index: number;
  cardId: string;
  enabled: boolean;
  onPress: (id: string) => void;
}) {
  const colors = useColors();
  const glow = useSharedValue(0.4);

  useEffect(() => {
    const delay = index * 220;
    glow.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.95, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.4, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => {
      cancelAnimation(glow);
    };
  }, [index, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 1 + glow.value * 0.15 }],
  }));

  const handlePress = () => {
    if (!enabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onPress(cardId);
  };

  return (
    <View style={styles.cardSlot}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowAura,
          { backgroundColor: colors.neonGold, shadowColor: colors.neonGold },
          glowStyle,
        ]}
      />
      <CardComponent
        faceDown
        size="lg"
        onPress={enabled ? handlePress : undefined}
      />
    </View>
  );
}

const AUTO_PLAY_SECONDS = 15;

export default function FaceDownStage({ faceDownIds, isMyTurn, onPlayCard }: FaceDownStageProps) {
  const colors = useColors();

  // Headline pulse only when it's the player's turn.
  const labelGlow = useSharedValue(0.6);
  useEffect(() => {
    if (!isMyTurn) {
      labelGlow.value = withTiming(0.5, { duration: 300 });
      return;
    }
    labelGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(labelGlow);
  }, [isMyTurn, labelGlow]);

  const labelStyle = useAnimatedStyle(() => ({ opacity: labelGlow.value }));

  // Auto-pick countdown. If the player sits on the face-down stage without
  // tapping for AUTO_PLAY_SECONDS, the client picks a random face-down card
  // for them so the match doesn't stall. The countdown resets whenever the
  // turn changes or the set of face-down ids changes (which happens after a
  // successful play). Tapping a card unmounts this view, cancelling the timer.
  const [secondsLeft, setSecondsLeft] = useState(AUTO_PLAY_SECONDS);
  const firedRef = useRef(false);

  // Stable key for the current "wait window" — restart the timer when the
  // turn flips on/off or when the cards available to reveal change.
  const waitKey = `${isMyTurn ? 'me' : 'them'}_${faceDownIds.join('_')}`;

  useEffect(() => {
    firedRef.current = false;
    if (!isMyTurn || faceDownIds.length === 0) {
      setSecondsLeft(AUTO_PLAY_SECONDS);
      return;
    }
    setSecondsLeft(AUTO_PLAY_SECONDS);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, AUTO_PLAY_SECONDS - elapsed);
      setSecondsLeft(remaining);
      if (remaining <= 0 && !firedRef.current) {
        firedRef.current = true;
        clearInterval(interval);
        // Pick a random face-down card so the choice isn't predictable.
        const pickIndex = Math.floor(Math.random() * faceDownIds.length);
        const pick = faceDownIds[pickIndex] ?? faceDownIds[0]!;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        onPlayCard(pick);
      }
    }, 200);
    return () => clearInterval(interval);
    // waitKey captures all the inputs that should reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitKey]);

  // Color the countdown gold/orange/red as it ticks down.
  const countdownColor =
    secondsLeft > 8 ? colors.neonGold : secondsLeft > 4 ? colors.neonOrange : '#ff4d6d';

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.headline, { color: colors.neonGold }, labelStyle]}>
        ✦ FINAL {faceDownIds.length} ✦ TAP TO REVEAL
      </Animated.Text>
      <Text style={[styles.subhead, { color: colors.mutedForeground }]}>
        Blind play — if it can&apos;t land on the pile, you take the pile
      </Text>

      {isMyTurn && faceDownIds.length > 0 ? (
        <Text style={[styles.countdown, { color: countdownColor }]}>
          ⏱  AUTO-REVEAL IN {secondsLeft}s
        </Text>
      ) : null}

      <View style={styles.row}>
        {faceDownIds.map((id, i) => (
          <AnimatedFaceDownCard
            key={id}
            index={i}
            cardId={id}
            enabled={isMyTurn}
            onPress={onPlayCard}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 70,
    alignItems: 'center',
  },
  headline: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(255, 215, 0, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  subhead: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  countdown: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
    marginLeft: -40,
  },
  cardSlot: {
    width: 88,
    height: 122,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowAura: {
    position: 'absolute',
    width: 76,
    height: 104,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 22,
    elevation: 10,
  },
});
