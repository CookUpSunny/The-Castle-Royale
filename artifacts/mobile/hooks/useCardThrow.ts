import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { Card as CardType, LastEvent } from '@/contexts/GameContext';
import { usePileDropHighlight } from '@/hooks/usePileDropHighlight';
import { cardMayPlay, resolveDragRelease } from '@/lib/cardPlayMotion';
import { THROW_SAFETY_MS, pendingThrowOutcome, throwLanded } from '@/lib/cardThrow';
import { DUR, EASE_OUT, SPRING_SNAP } from '@/lib/motion';

export interface CardThrow {
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  dragStartX: SharedValue<number>;
  dragStartY: SharedValue<number>;
  dragVisible: SharedValue<number>;
  dragScale: SharedValue<number>;
  dragActive: SharedValue<number>;
  draggingCard: CardType | null;
  /** Card under the finger. The hand draws it at 0.35. */
  heldCardId: string | null;
  /** Thrown card waiting on the server. The hand hides it and keeps the slot. */
  pendingPlayId: string | null;
  /** Drag plays skip the second flight from the hand. */
  skipCardId: string | null;
  tapOrigin: { cardId: string; x: number; y: number } | null;
  pileHighlighted: boolean;
  placePile: (pageX: number, pageY: number, width: number, height: number) => void;
  onDragStart: (card: CardType, x: number, y: number) => void;
  onDragEnd: (x: number, y: number, velocityX: number, velocityY: number) => void;
  onFanPlay: (cardId: string, origin: { x: number; y: number }) => void;
}

/**
 * The card under the finger is the card that lands.
 * A legal release springs into the pile with the finger's velocity.
 * An illegal release springs back to the lift point.
 */
export function useCardThrow(input: {
  discardPile: readonly { value: number }[];
  mustPlayStarter?: boolean;
  handTop: number;
  myPlayerId: string;
  lastEvent: LastEvent | undefined;
  handIds: readonly string[];
  playErrorSeq: number;
  playCard: (cardId: string) => void;
}): CardThrow {
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const dragVisible = useSharedValue(0);
  const dragScale = useSharedValue(1);
  const dragActive = useSharedValue(0);
  const pileX = useSharedValue(0);
  const pileY = useSharedValue(0);
  const pileReady = useSharedValue(0);

  const [draggingCard, setDraggingCard] = useState<CardType | null>(null);
  const [pendingPlayId, setPendingPlayId] = useState<string | null>(null);
  const [skipCardId, setSkipCardId] = useState<string | null>(null);
  const [tapOrigin, setTapOrigin] = useState<{ cardId: string; x: number; y: number } | null>(null);
  const [pileHighlighted, setPileHighlighted] = useState(false);
  const draggingCardRef = useRef<CardType | null>(null);
  const pendingRef = useRef<string | null>(null);
  const handIdsRef = useRef(input.handIds);
  const handTopRef = useRef(input.handTop);
  const pileRef = useRef(input.discardPile);
  const starterRef = useRef(input.mustPlayStarter);
  const playCardRef = useRef(input.playCard);
  const seenError = useRef(input.playErrorSeq);

  handIdsRef.current = input.handIds;
  handTopRef.current = input.handTop;
  pileRef.current = input.discardPile;
  starterRef.current = input.mustPlayStarter;
  playCardRef.current = input.playCard;

  usePileDropHighlight(dragX, dragY, dragActive, pileX, pileY, pileReady, setPileHighlighted);

  const clearGhost = useCallback(() => {
    draggingCardRef.current = null;
    pendingRef.current = null;
    setDraggingCard(null);
    setPendingPlayId(null);
    dragVisible.value = 0;
    dragScale.value = 1;
    dragActive.value = 0;
  }, [dragActive, dragScale, dragVisible]);

  const springHome = useCallback((velocityX = 0, velocityY = 0) => {
    setPileHighlighted(false);
    dragScale.value = withTiming(1, { duration: DUR.press, easing: EASE_OUT });
    dragX.value = withSpring(dragStartX.value, { ...SPRING_SNAP, velocity: velocityX }, (finished) => {
      'worklet';
      if (finished) scheduleOnRN(clearGhost);
    });
    dragY.value = withSpring(dragStartY.value, { ...SPRING_SNAP, velocity: velocityY });
  }, [clearGhost, dragScale, dragStartX, dragStartY, dragX, dragY]);

  const placePile = useCallback((pageX: number, pageY: number, width: number, height: number) => {
    pileX.value = pageX + width / 2;
    pileY.value = pageY + height / 2;
    pileReady.value = 1;
  }, [pileReady, pileX, pileY]);

  const onDragStart = useCallback((card: CardType, x: number, y: number) => {
    draggingCardRef.current = card;
    pendingRef.current = null;
    setPendingPlayId(null);
    setDraggingCard(card);
    dragStartX.value = x;
    dragStartY.value = y;
    dragVisible.value = withTiming(1, { duration: 80 });
    dragScale.value = withTiming(1.06, { duration: DUR.press, easing: EASE_OUT });
    Haptics.selectionAsync().catch(() => {});
  }, [dragScale, dragStartX, dragStartY, dragVisible]);

  const onDragEnd = useCallback((x: number, y: number, velocityX: number, velocityY: number) => {
    const card = draggingCardRef.current;
    const dropReady = pileReady.value === 1;
    const dropX = pileX.value;
    const dropY = pileY.value;
    const playable = !!card && cardMayPlay(card, pileRef.current, !!starterRef.current);
    const decision = dropReady && card
      ? resolveDragRelease({
          x,
          y,
          pileX: dropX,
          pileY: dropY,
          handTop: handTopRef.current,
          playable,
          velocityY,
        })
      : 'snap';
    setPileHighlighted(false);
    if (decision === 'play' && card) {
      pendingRef.current = card.id;
      setPendingPlayId(card.id);
      setSkipCardId(card.id);
      setTapOrigin(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      playCardRef.current(card.id);
      dragScale.value = withTiming(0.85, { duration: 300, easing: EASE_OUT });
      dragX.value = withSpring(dropX, { ...SPRING_SNAP, duration: 300, velocity: velocityX });
      dragY.value = withSpring(dropY, { ...SPRING_SNAP, duration: 300, velocity: velocityY });
      return;
    }
    springHome(velocityX, velocityY);
  }, [dragScale, dragX, dragY, pileReady, pileX, pileY, springHome]);

  const onFanPlay = useCallback((cardId: string, origin: { x: number; y: number }) => {
    setSkipCardId(null);
    setTapOrigin({ cardId, x: origin.x, y: origin.y });
    playCardRef.current(cardId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  useEffect(() => {
    const pending = pendingPlayId;
    if (!pending) return;
    if (throwLanded(input.lastEvent, input.myPlayerId, pending)) {
      clearGhost();
    }
  }, [clearGhost, input.lastEvent, input.myPlayerId, pendingPlayId]);

  useEffect(() => {
    if (!pendingPlayId) return;
    const pending = pendingPlayId;
    const timer = setTimeout(() => {
      if (pendingRef.current !== pending) return;
      const outcome = pendingThrowOutcome({
        landed: throwLanded(input.lastEvent, input.myPlayerId, pending),
        cardStillInHand: handIdsRef.current.includes(pending),
      });
      if (outcome === 'reject') {
        springHome();
        return;
      }
      clearGhost();
    }, THROW_SAFETY_MS);
    return () => clearTimeout(timer);
  }, [clearGhost, input.lastEvent, input.myPlayerId, pendingPlayId, springHome]);

  useEffect(() => {
    if (seenError.current === input.playErrorSeq) return;
    seenError.current = input.playErrorSeq;
    if (!pendingRef.current && !draggingCardRef.current) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    setSkipCardId(null);
    springHome();
  }, [input.playErrorSeq, springHome]);

  return {
    dragX,
    dragY,
    dragStartX,
    dragStartY,
    dragVisible,
    dragScale,
    dragActive,
    draggingCard,
    heldCardId: pendingPlayId ? null : draggingCard?.id ?? null,
    pendingPlayId,
    skipCardId,
    tapOrigin,
    pileHighlighted,
    placePile,
    onDragStart,
    onDragEnd,
    onFanPlay,
  };
}
