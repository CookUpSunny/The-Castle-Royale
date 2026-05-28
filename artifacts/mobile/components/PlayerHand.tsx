import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
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
  /** When true, cards can be dragged to the pile in addition to tapped. */
  draggable?: boolean;
  onDragStart?: (card: CardType, x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  /** Override the available width used for fan arc math (defaults to full screen width). Pass when the container is narrower than the screen. */
  availableWidth?: number;
}

// ─── Fan arc constants ────────────────────────────────────────────────────────
const CARD_WIDTH = 66;
const CARD_HEIGHT = 100;
/** Visible height of the fan container. Cards arc within this space. */
const FAN_CONTAINER_H = 160;
/** Radius of the imaginary circle whose arc the card bottoms follow. */
const FAN_PIVOT_R = 190;
/** Maximum half-spread in degrees (each side from center). */
const MAX_HALF_SPREAD = 40;

/**
 * Compute the absolute position and rotation for card [index] of [total]
 * in the pinched-accordion fan layout.
 */
function computeFanPosition(
  index: number,
  total: number,
  containerWidth: number,
): { left: number; top: number; rotationDeg: number } {
  const center = (total - 1) / 2;
  // Total spread grows with hand size, capped at ±MAX_HALF_SPREAD each side.
  const totalSpreadDeg = total <= 1 ? 0 : Math.min(total * 7, MAX_HALF_SPREAD * 2);
  const perCardDeg = total > 1 ? totalSpreadDeg / (total - 1) : 0;
  const rotationDeg = (index - center) * perCardDeg;
  const rotationRad = (rotationDeg * Math.PI) / 180;

  // Pivot sits below the container so the arc curves nicely upward.
  // pivotY is measured from the container top; setting it to
  // (FAN_CONTAINER_H + FAN_PIVOT_R - 10) places the center card bottom
  // 10 px above the container's bottom edge.
  const pivotX = containerWidth / 2;
  const pivotY = FAN_CONTAINER_H + FAN_PIVOT_R - 10;

  const cardBottomX = pivotX + FAN_PIVOT_R * Math.sin(rotationRad);
  const cardBottomY = pivotY - FAN_PIVOT_R * Math.cos(rotationRad);

  return {
    left: cardBottomX - CARD_WIDTH / 2,
    top: cardBottomY - CARD_HEIGHT,
    rotationDeg,
  };
}

// ─── HandCard ─────────────────────────────────────────────────────────────────

function HandCard({
  card,
  isPlayable,
  isMyTurn,
  multiplicity,
  onTap,
  onLongPress,
  isStarterPick,
  draggable,
  onDragStart,
  onDragMove,
  onDragEnd,
  isSelected,
  isDimmed,
  hoveredIndex,
  myIndex,
}: {
  card: CardType;
  isPlayable: boolean;
  isMyTurn: boolean;
  multiplicity: number;
  onTap: (card: CardType) => void;
  onLongPress: (card: CardType) => void;
  isStarterPick?: boolean;
  draggable?: boolean;
  onDragStart?: (card: CardType, x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  isSelected?: boolean;
  isDimmed?: boolean;
  hoveredIndex?: SharedValue<number>;
  myIndex?: number;
}) {
  const bounce = useSharedValue(0);
  const glowOpacity = useSharedValue(isPlayable && isMyTurn ? 0.4 : 0.12);

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

  useEffect(() => {
    const peak = isPlayable && isMyTurn ? 0.75 : 0.18;
    const trough = isPlayable && isMyTurn ? 0.25 : 0.06;
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(peak, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        withTiming(trough, { duration: 600, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(glowOpacity);
  }, [isPlayable, isMyTurn, glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  // Raise animation: –28 px when hovered or selected
  const raiseY = useSharedValue(0);
  const isSelectedSV = useSharedValue(isSelected ?? false);
  useEffect(() => {
    isSelectedSV.value = isSelected ?? false;
  }, [isSelected, isSelectedSV]);

  useAnimatedReaction(
    () => {
      const hovered = hoveredIndex !== undefined && myIndex !== undefined
        ? hoveredIndex.value === myIndex
        : false;
      return hovered || isSelectedSV.value;
    },
    (shouldRaise) => {
      raiseY.value = withTiming(shouldRaise ? -28 : 0, { duration: 120 });
    },
  );

  // Bounce is the only per-card animation — arc position + rotation are
  // handled by the absolutely-positioned wrapper in the parent.
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value + raiseY.value }],
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

  const dragGesture = useMemo(() => {
    if (!draggable || !isMyTurn || !isPlayable) return null;
    const _card = card;
    const _onDragStart = onDragStart;
    const _onDragMove = onDragMove;
    const _onDragEnd = onDragEnd;
    return Gesture.Pan()
      .activateAfterLongPress(350)
      .onStart((e) => {
        'worklet';
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
        if (_onDragStart) runOnJS(_onDragStart)(_card, e.absoluteX, e.absoluteY);
      })
      .onUpdate((e) => {
        'worklet';
        if (_onDragMove) runOnJS(_onDragMove)(e.absoluteX, e.absoluteY);
      })
      .onEnd((e) => {
        'worklet';
        if (_onDragEnd) runOnJS(_onDragEnd)(e.absoluteX, e.absoluteY);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggable, isMyTurn, isPlayable, card]);

  const starterGlowStyle = isStarterPick
    ? ({
        shadowColor: '#fde047',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 16,
        elevation: 18,
        borderRadius: 10,
      } as const)
    : undefined;

  const softGlowWrap = {
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 } as const,
    shadowRadius: 5,
    elevation: 2,
    borderRadius: 10,
  };

  const dimStyle = isDimmed ? { opacity: 0.6 } : undefined;

  const cardNode = (
    <View style={dimStyle}>
      <Animated.View style={[softGlowWrap, glowStyle, animStyle]}>
        <Animated.View style={starterGlowStyle}>
          <CardComponent
            card={card}
            size="lg"
            onPress={isMyTurn && isPlayable ? handlePress : undefined}
            onLongPress={isMyTurn && isPlayable && multiplicity >= 2 ? handleLongPress : undefined}
            isPlayable={isMyTurn && isPlayable}
            multiplicity={multiplicity}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );

  const cardNodeFinal = dragGesture
    ? (
      <View style={dimStyle}>
        <Animated.View style={[softGlowWrap, glowStyle, animStyle]}>
          <Animated.View style={starterGlowStyle}>
            <CardComponent
              card={card}
              size="lg"
              onPress={isMyTurn && isPlayable ? handlePress : undefined}
              onLongPress={isMyTurn && isPlayable && multiplicity >= 2 ? handleLongPress : undefined}
              isPlayable={isMyTurn && isPlayable}
              multiplicity={multiplicity}
            />
          </Animated.View>
        </Animated.View>
      </View>
    )
    : cardNode;

  if (dragGesture) {
    return <GestureDetector gesture={dragGesture}>{cardNodeFinal}</GestureDetector>;
  }
  return cardNode;
}

// ─── PlayerHand ───────────────────────────────────────────────────────────────

/** Imperative handle so game.tsx can dismiss selection on outside taps. */
export interface PlayerHandRef {
  clearSelection: () => void;
}

const PlayerHand = React.forwardRef<PlayerHandRef, PlayerHandProps>(function PlayerHand({
  hand,
  faceUp,
  faceDownCount,
  faceDownIds,
  discardPile,
  isMyTurn,
  onPlayCard,
  onPlayCards,
  mustPlayStarter,
  draggable,
  onDragStart,
  onDragMove,
  onDragEnd,
  availableWidth,
}: PlayerHandProps, ref) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = availableWidth ?? screenWidth;
  const showHand = hand.length > 0;
  const showFaceUp = hand.length === 0 && faceUp.length > 0;
  const showFaceDown = hand.length === 0 && faceUp.length === 0 && faceDownCount > 0;

  const activeCards: CardType[] = showHand ? hand : showFaceUp ? faceUp : [];
  const totalCards = showHand ? hand.length : showFaceUp ? faceUp.length : faceDownCount;

  // ── Two-tap selection ──────────────────────────────────────────────────────
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Expose clearSelection so game.tsx can dismiss when tapping outside the hand.
  useImperativeHandle(ref, () => ({ clearSelection: () => setSelectedCardId(null) }), []);

  // Clear selection whenever the turn flips (prevents a stale "selected" card
  // from persisting while the opponent is playing).
  useEffect(() => {
    if (!isMyTurn) setSelectedCardId(null);
  }, [isMyTurn]);

  // Clear if the selected card leaves the hand (e.g. played by server ack).
  useEffect(() => {
    if (selectedCardId && !activeCards.find((c) => c.id === selectedCardId)) {
      setSelectedCardId(null);
    }
  }, [activeCards, selectedCardId]);

  // ── Drag hover tracking ────────────────────────────────────────────────────
  const hoveredIndex = useSharedValue(-1);

  // Pre-compute each card's horizontal centre so the pan worklet can find the
  // closest card without calling back to JS.
  const cardCenters = useMemo(() =>
    showHand
      ? activeCards.map((_, i) => {
          const { left } = computeFanPosition(i, totalCards, containerWidth);
          return left + CARD_WIDTH / 2;
        })
      : [],
  [showHand, totalCards, containerWidth]);

  const hoverPan = useMemo(() =>
    Gesture.Pan()
      .minDistance(3)
      .onUpdate((e) => {
        'worklet';
        if (cardCenters.length === 0) return;
        let closest = -1;
        let minDist = 55; // px threshold — outside this range nothing is hovered
        for (let i = 0; i < cardCenters.length; i++) {
          const dist = Math.abs(e.x - (cardCenters[i] ?? 0));
          if (dist < minDist) { minDist = dist; closest = i; }
        }
        hoveredIndex.value = closest;
      })
      .onEnd(() => { 'worklet'; hoveredIndex.value = -1; })
      .onFinalize(() => { 'worklet'; hoveredIndex.value = -1; }),
  // Recreate when card positions change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [cardCenters]);

  // In starter mode the LOWEST-VALUE card from the active zone gets a gold
  // glow so the player knows the strategically-correct sacrifice without being
  // forced into it.
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
        playable: mustPlayStarter ? true : canPlayCardFn(cards[0]!, discardPile),
      }))
      .sort((a, b) => a.value - b.value);
  }, [activeCards, discardPile, mustPlayStarter]);

  const valueCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const c of activeCards) counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
    return counts;
  }, [activeCards]);

  // Fan-only two-tap: first tap selects, second tap plays.
  const handleTap = useCallback((card: CardType) => {
    if (selectedCardId === card.id) {
      onPlayCard(card.id);
      setSelectedCardId(null);
    } else {
      setSelectedCardId(card.id);
    }
  }, [selectedCardId, onPlayCard]);

  // Face-up phase uses immediate single-tap play (no selection state).
  const handleFaceUpTap = useCallback((card: CardType) => {
    onPlayCard(card.id);
  }, [onPlayCard]);

  const handleLongPress = useCallback((card: CardType) => {
    const ids = activeCards.filter((c) => c.value === card.value).map((c) => c.id);
    if (ids.length === 0) return;
    setSelectedCardId(null);
    onPlayCards(ids);
  }, [activeCards, onPlayCards]);

  const handlePlayAll = useCallback((value: number, enabled: boolean) => {
    if (!enabled) return;
    const ids = activeCards.filter((c) => c.value === value).map((c) => c.id);
    if (ids.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setSelectedCardId(null);
    onPlayCards(ids);
  }, [activeCards, onPlayCards]);

  // Must be AFTER all hooks (Rules of Hooks — see comment in original code).
  if (showFaceDown) {
    return (
      <View style={{ paddingLeft: 50 }}>
        <FaceDownStage
          faceDownIds={faceDownIds.length > 0 ? faceDownIds : Array.from({ length: faceDownCount }).map((_, i) => `fd_${i}`)}
          isMyTurn={isMyTurn}
          onPlayCard={onPlayCard}
        />
      </View>
    );
  }

  return (
    <Pressable style={styles.container} onPress={() => setSelectedCardId(null)}>
      {/* Multi-play chips — one per duplicate group */}
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

      {showFaceUp ? (
        /* Face-up final phase — stationary centered cards (single-tap play) */
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
                onTap={handleFaceUpTap}
                onLongPress={handleLongPress}
              />
            );
          })}
        </View>
      ) : (
        /* ── Pinched accordion fan ──
           Two-tap selection + hover raise are portrait-only features (draggable=false).
           When draggable=true (landscape), the old single-tap behaviour is preserved. */
        <GestureDetector gesture={draggable ? Gesture.Manual() : hoverPan}>
          <View style={[styles.fanContainer, { width: containerWidth }]}>
            {activeCards.map((card, i) => {
              const isPlayable = mustPlayStarter ? true : canPlayCardFn(card, discardPile);
              const multiplicity = valueCounts.get(card.value) ?? 1;
              const { left, top, rotationDeg } = computeFanPosition(i, totalCards, containerWidth);
              // Selection state and hover raise are portrait-only
              const isThisSelected = !draggable && selectedCardId === card.id;
              const isDimmed = !draggable && selectedCardId !== null && !isThisSelected && isPlayable;
              return (
                <View
                  key={card.id}
                  style={[
                    styles.fanCardWrapper,
                    {
                      left,
                      top,
                      zIndex: isThisSelected ? totalCards + 1 : i,
                      transform: [{ rotate: `${rotationDeg}deg` }],
                    },
                  ]}
                >
                  <HandCard
                    card={card}
                    isPlayable={isPlayable}
                    isMyTurn={isMyTurn}
                    multiplicity={multiplicity}
                    onTap={draggable ? handleFaceUpTap : handleTap}
                    onLongPress={handleLongPress}
                    isStarterPick={card.id === starterPickId}
                    draggable={draggable}
                    onDragStart={onDragStart}
                    onDragMove={onDragMove}
                    onDragEnd={onDragEnd}
                    isSelected={isThisSelected}
                    isDimmed={isDimmed}
                    hoveredIndex={draggable ? undefined : hoveredIndex}
                    myIndex={i}
                  />
                </View>
              );
            })}
          </View>
        </GestureDetector>
      )}
    </Pressable>
  );
});

export default PlayerHand;

// ─── FaceUpCardSlot ───────────────────────────────────────────────────────────

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
  multiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginBottom: 30,
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
  fanContainer: {
    height: FAN_CONTAINER_H,
    overflow: 'visible',
  },
  fanCardWrapper: {
    position: 'absolute',
  },
});
