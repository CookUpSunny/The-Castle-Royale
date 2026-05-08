import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { type Card as CardType, getCardLabel } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import CardComponent from './Card';
import FaceDownStage from './FaceDownStage';

function canPlayCardFn(card: CardType, pile: CardType[]): boolean {
  if (pile.length === 0) return true;
  const top = pile[pile.length - 1]!;
  if (card.value === 2 || card.value === 10) return true;
  if (top.value === 2) return true;
  return card.value >= top.value;
}

interface PlayerHandProps {
  hand: CardType[];
  faceUp: CardType[];
  faceDownCount: number;
  faceDownIds: string[];
  discardPile: CardType[];
  isMyTurn: boolean;
  onPlayCard: (cardId: string) => void;
  onPlayCards: (cardIds: string[]) => void;
  /** Starter mode: player just picked up the pile and must commit one card to restart it. Any card is playable; the lowest is recommended. Multi-play is disabled. */
  mustPlayStarter?: boolean;
}

function HandCard({
  card,
  isPlayable,
  isMyTurn,
  multiplicity,
  onTap,
  onLongPress,
  overlap,
  index,
  total,
  isStarterPick,
}: {
  card: CardType;
  isPlayable: boolean;
  isMyTurn: boolean;
  multiplicity: number;
  onTap: (card: CardType) => void;
  onLongPress: (card: CardType) => void;
  overlap: number;
  index: number;
  total: number;
  isStarterPick?: boolean;
}) {
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 620, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 360, easing: Easing.in(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(bounce);
  }, [bounce]);

  // Fan curve: distribute rotation symmetrically from center.
  // perCardDeg is capped so a large hand never exceeds ±12° total spread.
  const center = (total - 1) / 2;
  const perCardDeg = total > 1 ? Math.min(3, 20 / (total - 1)) : 0;
  const fanAngle = (index - center) * perCardDeg;
  // Edge cards arc upward (negative Y) — center is the lowest point.
  const arcRise = Math.abs(index - center) * 3;

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounce.value - arcRise },
      { rotateZ: `${fanAngle}deg` },
    ],
  }));

  const handlePress = useCallback(() => {
    if (!isMyTurn || !isPlayable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onTap(card);
  }, [card, isMyTurn, isPlayable, onTap]);

  const handleLongPress = useCallback(() => {
    if (!isMyTurn || !isPlayable || multiplicity < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onLongPress(card);
  }, [card, isMyTurn, isPlayable, multiplicity, onLongPress]);

  return (
    <Animated.View
      style={[
        { marginLeft: overlap },
        isStarterPick && {
          shadowColor: '#fde047',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 16,
          elevation: 18,
          borderRadius: 10,
        },
        animStyle,
      ]}
    >
      <CardComponent
        card={card}
        size="lg"
        onPress={isMyTurn && isPlayable ? handlePress : undefined}
        onLongPress={isMyTurn && isPlayable && multiplicity >= 2 ? handleLongPress : undefined}
        isPlayable={isMyTurn && isPlayable}
        multiplicity={multiplicity}
      />
    </Animated.View>
  );
}

export default function PlayerHand({ hand, faceUp, faceDownCount, faceDownIds, discardPile, isMyTurn, onPlayCard, onPlayCards, mustPlayStarter }: PlayerHandProps) {
  const colors = useColors();
  const showHand = hand.length > 0;
  const showFaceUp = hand.length === 0 && faceUp.length > 0;
  const showFaceDown = hand.length === 0 && faceUp.length === 0 && faceDownCount > 0;

  const activeCards: CardType[] = showHand ? hand : showFaceUp ? faceUp : [];
  const totalCards = showHand ? hand.length : showFaceUp ? faceUp.length : faceDownCount;
  const discardLabel = (() => {
    const n = discardPile.length;
    if (n === 0) return 'DISCARD · EMPTY';
    return `DISCARD · ${n} ${n === 1 ? 'CARD' : 'CARDS'}`;
  })();

  const activeLabel = mustPlayStarter
    ? '🃏 PLAY YOUR STARTER · ANY CARD'
    : showHand
    ? discardLabel
    : showFaceUp
    ? `FACE-UP CARDS (${faceUp.length})`
    : `FACE-DOWN — TAP BLIND (${faceDownCount})`;

  // In starter mode the LOWEST-VALUE card from the active zone gets a gold
  // glow so the player knows the strategically-correct sacrifice without being
  // forced into it. No text badge — the glow speaks for itself.
  const starterPickId: string | null = (() => {
    if (!mustPlayStarter || activeCards.length === 0) return null;
    const sorted = [...activeCards].sort((a, b) => a.value - b.value);
    const nonSpecial = sorted.find((c) => c.value !== 2 && c.value !== 10);
    return (nonSpecial ?? sorted[0]!).id;
  })();

  // Group active cards by value to find playable duplicate groups
  const duplicateGroups = useMemo(() => {
    const groups = new Map<number, CardType[]>();
    for (const c of activeCards) {
      const arr = groups.get(c.value) ?? [];
      arr.push(c);
      groups.set(c.value, arr);
    }
    return Array.from(groups.entries())
      .filter(([, cards]) => cards.length >= 2)
      .filter(([value]) => mustPlayStarter ? true : value)
      .map(([value, cards]) => ({
        value,
        cards,
        // In starter mode every duplicate group is legal — pile is empty and
        // the server accepts any same-value bundle. Otherwise check pile-match.
        playable: mustPlayStarter ? true : canPlayCardFn(cards[0]!, discardPile),
      }))
      .sort((a, b) => a.value - b.value);
  }, [activeCards, discardPile, mustPlayStarter]);

  const valueCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const c of activeCards) counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
    return counts;
  }, [activeCards]);

  const overlap = totalCards > 5 ? -28 : -10;

  const handleTap = useCallback((card: CardType) => {
    onPlayCard(card.id);
  }, [onPlayCard]);

  const handleLongPress = useCallback((card: CardType) => {
    const ids = activeCards.filter((c) => c.value === card.value).map((c) => c.id);
    if (ids.length === 0) return;
    onPlayCards(ids);
  }, [activeCards, onPlayCards]);

  const handlePlayAll = useCallback((value: number, enabled: boolean) => {
    if (!enabled) return;
    const ids = activeCards.filter((c) => c.value === value).map((c) => c.id);
    if (ids.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onPlayCards(ids);
  }, [activeCards, onPlayCards]);

  // When the player is in the blind face-down stage, render a dedicated animated
  // standout instead of the normal hand strip — cards lift up the screen, glow,
  // and breathe so the final reveals feel cinematic and easy to tap.
  // NOTE: This must be rendered AFTER all hooks have been called above (Rules
  // of Hooks). Returning early before the hooks would crash the app with
  // "Rendered fewer hooks than expected" the moment the player transitions
  // from face-up → face-down (end of castle).
  if (showFaceDown) {
    return (
      <FaceDownStage
        faceDownIds={faceDownIds.length > 0 ? faceDownIds : Array.from({ length: faceDownCount }).map((_, i) => `fd_${i}`)}
        isMyTurn={isMyTurn}
        onPlayCard={onPlayCard}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.neonGold }]}>{activeLabel}</Text>

      {/* Multi-play chips: one per duplicate group. Disabled (greyed out) when not your turn or not playable.
          In starter mode every duplicate group is legal (no pile-match), so chips light up for free.
          Also shown in face-up mode — players can play doubles/triples from face-up cards too. */}
      {(showHand || showFaceUp) && duplicateGroups.length > 0 && (
        <View style={styles.multiRow}>
          {duplicateGroups.map((g) => {
            const enabled = isMyTurn && g.playable;
            return (
              <Pressable
                key={g.value}
                onPress={() => handlePlayAll(g.value, enabled)}
                disabled={!enabled}
                style={({ pressed }) => [
                  styles.multiChip,
                  enabled
                    ? {
                        backgroundColor: colors.neonGold,
                        borderColor: colors.neonGold,
                        opacity: pressed ? 0.7 : 1,
                      }
                    : {
                        backgroundColor: 'transparent',
                        borderColor: 'rgba(168, 85, 247, 0.4)',
                        opacity: 0.55,
                      },
                ]}
                accessibilityLabel={`Play all ${g.cards.length} ${getCardLabel(g.value)}s`}
              >
                <Text
                  style={[
                    styles.multiChipText,
                    !enabled && { color: 'rgba(255,255,255,0.55)' },
                  ]}
                >
                  PLAY ALL {getCardLabel(g.value)} x{g.cards.length}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {(showHand || showFaceUp) && !mustPlayStarter && duplicateGroups.length > 0 && (
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          Tap a chip to play multiples · or long-press a card
        </Text>
      )}
      {mustPlayStarter && (
        <Text style={[styles.hint, { color: '#fde047' }]}>
          Picked up the pile — tap any card or a chip to play doubles/triples
        </Text>
      )}

      {showFaceUp ? (
        /* Face-up final phase — cards are stationary and centered, same
           treatment as the face-down stage so the player can tap clearly. */
        <View style={styles.faceUpRow}>
          {activeCards.map((card, i) => {
            const isPlayable = canPlayCardFn(card, discardPile);
            const multiplicity = valueCounts.get(card.value) ?? 1;
            return (
              <FaceUpCardSlot
                key={card.id}
                card={card}
                index={i}
                isPlayable={isPlayable}
                isMyTurn={isMyTurn}
                multiplicity={multiplicity}
                onTap={handleTap}
                onLongPress={handleLongPress}
              />
            );
          })}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          scrollEnabled={activeCards.length > 6 || faceDownCount > 6}
        >
          {activeCards.map((card, i) => {
            const isPlayable = mustPlayStarter ? true : canPlayCardFn(card, discardPile);
            const multiplicity = valueCounts.get(card.value) ?? 1;
            return (
              <HandCard
                key={card.id}
                card={card}
                isPlayable={isPlayable}
                isMyTurn={isMyTurn}
                multiplicity={multiplicity}
                onTap={handleTap}
                onLongPress={handleLongPress}
                overlap={i === 0 ? 0 : overlap}
                index={i}
                total={activeCards.length}
                isStarterPick={card.id === starterPickId}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * A single face-up card rendered stationary with a pulsing gold aura —
 * matching the cinematic treatment of the face-down stage so the final
 * face-up phase feels just as intentional and easy to tap.
 */
function FaceUpCardSlot({
  card,
  index,
  isPlayable,
  isMyTurn,
  multiplicity,
  onTap,
  onLongPress,
}: {
  card: CardType;
  index: number;
  isPlayable: boolean;
  isMyTurn: boolean;
  multiplicity: number;
  onTap: (card: CardType) => void;
  onLongPress: (card: CardType) => void;
}) {
  const colors = useColors();
  const glow = useSharedValue(0.3);

  useEffect(() => {
    glow.value = withDelay(
      index * 180,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.3, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
    return () => cancelAnimation(glow);
  }, [index, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * (isPlayable && isMyTurn ? 1 : 0.3),
    shadowOpacity: glow.value,
  }));

  const handlePress = useCallback(() => {
    if (!isMyTurn || !isPlayable) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onTap(card);
  }, [card, isMyTurn, isPlayable, onTap]);

  const handleLongPress = useCallback(() => {
    if (!isMyTurn || !isPlayable || multiplicity < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    onLongPress(card);
  }, [card, isMyTurn, isPlayable, multiplicity, onLongPress]);

  return (
    <View style={faceUpStyles.cardSlot}>
      <Animated.View
        pointerEvents="none"
        style={[
          faceUpStyles.glowAura,
          { backgroundColor: colors.neonGold, shadowColor: colors.neonGold },
          glowStyle,
        ]}
      />
      <CardComponent
        card={card}
        size="lg"
        onPress={isMyTurn && isPlayable ? handlePress : undefined}
        onLongPress={isMyTurn && isPlayable && multiplicity >= 2 ? handleLongPress : undefined}
        isPlayable={isMyTurn && isPlayable}
        multiplicity={multiplicity}
      />
    </View>
  );
}

const faceUpStyles = StyleSheet.create({
  cardSlot: {
    width: 72,
    height: 102,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowAura: {
    position: 'absolute',
    width: 60,
    height: 86,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 10,
  },
});

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
  },
  faceUpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.5,
    marginBottom: 2,
  },
  hint: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  multiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  multiChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },
  multiChipText: {
    color: '#1a0535',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 32,
    alignItems: 'flex-end',
  },
});
