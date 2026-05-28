import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Card as CardType, useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import CardComponent, { CardBack } from './Card';

const FAN_R = 200;
const FAN_HALF_DEG = 40;
const FAN_H = 210;
const SLOT_W = 64;
const SLOT_H = 100;

/**
 * Castle/Palace pre-game setup.
 *
 * Players see all 6 of their dealt cards in one row. Each card is currently
 * either CASTLE (face-up) or HAND. Tap any card to toggle which zone it
 * belongs to. The constraint is exactly 3 cards face-up at all times — if a
 * tap would push the count over 3, the *oldest-promoted* castle card auto-
 * demotes to keep the balance. Tapping a face-up card auto-promotes the
 * *oldest-demoted* hand card. This makes the choice feel like single-tap
 * "toggle which 3 cards are my castle" with no two-step swap dance.
 */
export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { gameView, setFaceUp, confirmSetup } = useGame();

  // Track the recency order of how each card entered its current zone.
  // We use this as a FIFO queue to decide who gets auto-displaced when a
  // tap would otherwise break the 3/3 balance.
  const castleOrderRef = useRef<string[]>([]);
  const handOrderRef = useRef<string[]>([]);

  const myReady = gameView?.myReady ?? false;
  const opponentReady = gameView?.opponentReady ?? false;
  const opponentName = gameView?.opponentName ?? 'Opponent';

  // Initialize the recency queues from the current server state on first
  // mount and whenever new ids appear (e.g. after a remote rebalance).
  useEffect(() => {
    if (!gameView) return;
    const faceUpIds = gameView.myFaceUp.map((c) => c.id);
    const handIds = gameView.myHand.map((c) => c.id);

    castleOrderRef.current = [
      ...castleOrderRef.current.filter((id) => faceUpIds.includes(id)),
      ...faceUpIds.filter((id) => !castleOrderRef.current.includes(id)),
    ];
    handOrderRef.current = [
      ...handOrderRef.current.filter((id) => handIds.includes(id)),
      ...handIds.filter((id) => !handOrderRef.current.includes(id)),
    ];
  }, [gameView?.myFaceUp, gameView?.myHand]);

  const titleGlow = useSharedValue(0.6);
  useEffect(() => {
    titleGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.6, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
  }, [titleGlow]);
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleGlow.value }));

  // Stable display order for the 6 cards so they don't jump around when
  // toggled. We sort once (by suit then value) for a clean visual layout.
  const allDealt: CardType[] = useMemo(() => {
    if (!gameView) return [];
    const combined = [...gameView.myFaceUp, ...gameView.myHand];
    return combined.sort((a, b) => {
      if (a.value !== b.value) return a.value - b.value;
      return a.suit.localeCompare(b.suit);
    });
  }, [gameView?.myFaceUp, gameView?.myHand]);

  if (!gameView) return null;

  const faceUpIdSet = new Set(gameView.myFaceUp.map((c) => c.id));

  const handleToggle = (cardId: string) => {
    if (myReady) return;
    Haptics.selectionAsync().catch(() => {});

    const isCurrentlyFaceUp = faceUpIdSet.has(cardId);
    let nextFaceUp: string[];

    if (isCurrentlyFaceUp) {
      // DEMOTE this card — promote the oldest-demoted hand card to keep 3/3.
      const handIds = gameView.myHand.map((c) => c.id);
      const oldestHandId =
        handOrderRef.current.find((id) => handIds.includes(id) && id !== cardId) ?? handIds[0];
      if (!oldestHandId) return;
      nextFaceUp = gameView.myFaceUp.map((c) => c.id).filter((id) => id !== cardId);
      nextFaceUp.push(oldestHandId);
      // Update recency: this card is now the freshest hand entry; oldestHandId is now freshest castle entry.
      handOrderRef.current = [...handOrderRef.current.filter((id) => id !== oldestHandId), cardId];
      castleOrderRef.current = [...castleOrderRef.current.filter((id) => id !== cardId), oldestHandId];
    } else {
      // PROMOTE this card — demote the oldest-promoted castle card to keep 3/3.
      const faceUpIds = gameView.myFaceUp.map((c) => c.id);
      const oldestCastleId =
        castleOrderRef.current.find((id) => faceUpIds.includes(id) && id !== cardId) ?? faceUpIds[0];
      if (!oldestCastleId) return;
      nextFaceUp = faceUpIds.filter((id) => id !== oldestCastleId);
      nextFaceUp.push(cardId);
      castleOrderRef.current = [...castleOrderRef.current.filter((id) => id !== oldestCastleId), cardId];
      handOrderRef.current = [...handOrderRef.current.filter((id) => id !== cardId), oldestCastleId];
    }

    setFaceUp(nextFaceUp);
  };

  const handleConfirm = () => {
    if (myReady) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    confirmSetup();
  };

  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = screenWidth - 32;

  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#1a0040', '#0a0018', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.inner, { paddingTop: insets.top + webTopPad + 24, paddingBottom: insets.bottom + 24 }]}>

        <View style={[styles.opponentBanner, { borderColor: colors.border, backgroundColor: '#1a0535' }]}>
          <View style={[styles.statusDot, { backgroundColor: opponentReady ? '#22c55e' : colors.neonPurple }]} />
          <Text style={[styles.opponentText, { color: colors.foreground }]}>
            {opponentName} {opponentReady ? 'is ready' : 'is choosing...'}
          </Text>
        </View>

        <Animated.Text style={[styles.title, { color: colors.neonGold }, titleStyle]}>
          BUILD YOUR CASTLE
        </Animated.Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Tap any card to choose your 3 face-up cards.{"\n"}
          Strong cards face-up will defend you when the pile rises.
        </Text>

        {/* Face-down (locked) row — visual reminder of the third stage */}
        <View style={styles.faceDownRow}>
          {Array.from({ length: gameView.myFaceDownCount }).map((_, i) => (
            <View key={`fd_${i}`} style={styles.faceDownSlot}>
              <CardBack size="sm" />
            </View>
          ))}
          <Text style={[styles.faceDownLabel, { color: colors.mutedForeground }]}>BLIND CARDS · LOCKED</Text>
        </View>

        {/* Counter chip */}
        <View style={[styles.counterChip, { borderColor: colors.neonGold }]}>
          <Text style={[styles.counterText, { color: colors.neonGold }]}>
            ★ CASTLE: {gameView.myFaceUp.length} / 3
          </Text>
        </View>

        {/* All 6 cards in a semi-circle fan — tap to toggle */}
        <View style={[styles.fanContainer, { width: containerWidth }]}>
          {allDealt.map((card, i) => {
            const n = allDealt.length;
            const angleDeg = n <= 1 ? 0 : -FAN_HALF_DEG + (2 * FAN_HALF_DEG / (n - 1)) * i;
            const angleRad = (angleDeg * Math.PI) / 180;
            const left = containerWidth / 2 + FAN_R * Math.sin(angleRad) - SLOT_W / 2;
            const top = FAN_H / 2 + FAN_R * (1 - Math.cos(angleRad)) - SLOT_H / 2;
            return (
              <View
                key={card.id}
                style={[styles.fanCardWrapper, { left, top, transform: [{ rotate: `${angleDeg}deg` }] }]}
              >
                <ToggleCard
                  card={card}
                  isFaceUp={faceUpIdSet.has(card.id)}
                  disabled={myReady}
                  onPress={() => handleToggle(card.id)}
                />
              </View>
            );
          })}
        </View>

        {/* Hint legend */}
        <View style={styles.legend}>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.neonGold }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
              Gold border = face-up (castle)
            </Text>
          </View>
          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: '#3a1a5e' }]} />
            <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
              Plain = stays in your hand
            </Text>
          </View>
        </View>

        {/* Confirm */}
        <View style={styles.confirmWrap}>
          {myReady ? (
            <View style={[styles.readyChip, { borderColor: '#22c55e' }]}>
              <Text style={[styles.readyChipText, { color: '#22c55e' }]}>
                ✓ READY · WAITING FOR {opponentName.toUpperCase()}
              </Text>
            </View>
          ) : (
            <Pressable onPress={handleConfirm} style={({ pressed }) => [styles.confirmBtn, pressed && { opacity: 0.85 }]}>
              <LinearGradient colors={['#fbbf24', '#f59e0b', '#d97706']} style={styles.confirmBtnInner}>
                <Text style={styles.confirmBtnText}>LOCK IN CASTLE</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function ToggleCard({
  card,
  isFaceUp,
  disabled,
  onPress,
}: {
  card: CardType;
  isFaceUp: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const lift = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    lift.value = withTiming(isFaceUp ? -10 : 0, { duration: 220, easing: Easing.out(Easing.cubic) });
    glow.value = withTiming(isFaceUp ? 1 : 0, { duration: 220 });
  }, [isFaceUp, lift, glow]);

  const liftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.7,
    transform: [{ scale: 1 + glow.value * 0.08 }],
  }));

  return (
    <View style={styles.toggleSlot}>
      {/* Castle indicator badge above the card */}
      {isFaceUp && (
        <Text style={[styles.castleBadge, { color: colors.neonGold }]}>★</Text>
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toggleGlow,
          { backgroundColor: colors.neonGold, shadowColor: colors.neonGold },
          glowStyle,
        ]}
      />
      <Animated.View
        style={[
          liftStyle,
          isFaceUp && {
            borderRadius: 12,
            borderWidth: 2,
            borderColor: colors.neonGold,
          },
        ]}
      >
        <CardComponent card={card} size="sm" onPress={disabled ? undefined : onPress} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'space-between' },
  opponentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  opponentText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  title: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 5,
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 4,
    paddingHorizontal: 12,
    fontStyle: 'italic',
  },
  faceDownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#0d0220',
  },
  faceDownSlot: { transform: [{ scale: 0.7 }] },
  faceDownLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginLeft: 8 },
  counterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#1a0535',
  },
  counterText: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
  fanContainer: {
    height: FAN_H,
    overflow: 'visible',
  },
  fanCardWrapper: {
    position: 'absolute',
  },
  toggleSlot: {
    width: 64,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  castleBadge: {
    position: 'absolute',
    top: -14,
    fontSize: 18,
    fontWeight: '900',
    textShadowColor: 'rgba(255,215,0,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
    zIndex: 2,
  },
  toggleGlow: {
    position: 'absolute',
    width: 54,
    height: 80,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  legend: { gap: 4, alignItems: 'center' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, letterSpacing: 0.5 },
  confirmWrap: { width: '100%', alignItems: 'center' },
  confirmBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 12,
  },
  confirmBtnInner: { height: 56, justifyContent: 'center', alignItems: 'center' },
  confirmBtnText: { color: '#07000f', fontSize: 17, fontWeight: '900', letterSpacing: 4 },
  readyChip: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  readyChipText: { fontSize: 13, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
});
