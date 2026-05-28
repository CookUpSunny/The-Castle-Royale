import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Card as CardType, useGame } from '@/contexts/GameContext';
import { AVATARS, useCosmetics } from '@/contexts/CosmeticsContext';
import { useMusicPlayer } from '@/contexts/MusicContext';
import { useColors } from '@/hooks/useColors';
import ActionButtons from '@/components/ActionButtons';
import BackButton from '@/components/BackButton';
import CardComponent, { CardBack } from '@/components/Card';
import CinematicPlay from '@/components/CinematicPlay';
import type { LayoutRect } from '@/components/CardPlayFlight';
import DrawPileStack, { type DrawPileHandle } from '@/components/DrawPileStack';
import SceneBackground from '@/components/SceneBackground';
import EmoteBubble from '@/components/EmoteBubble';
import EmotePicker from '@/components/EmotePicker';
import FaceDownReveal from '@/components/FaceDownReveal';
import MultiPlayBurst from '@/components/MultiPlayBurst';
import GlowPile from '@/components/GlowPile';
import PlayerHand from '@/components/PlayerHand';
import { lastEventIdentityKey } from '@/lib/lastEventDedupe';
import { layoutRectsCloseEnough } from '@/lib/layoutRect';

function canPlayCard(card: CardType, pile: CardType[]): boolean {
  if (pile.length === 0) return true;
  const top = pile[pile.length - 1]!;
  if (card.value === 2 || card.value === 10) return true;
  if (top.value === 2) return true;
  return card.value >= top.value;
}

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function fakeCoins(name: string): string {
  const v = 50000 + (hashName(name) % 150000);
  return v.toLocaleString();
}

/** Compact name + coins plate for landscape header corners. */
function NamePlate({ name, isActive, align, portraitArt, onPress, showMenuDots, compact }: {
  name: string;
  level?: string;
  coins?: string;
  gems?: string;
  isActive: boolean;
  align: 'left' | 'right';
  portraitArt?: number | null;
  onPress?: () => void;
  showMenuDots?: boolean;
  /** Compact pill variant: smaller avatar, single name line. Used for opponent top-right. */
  compact?: boolean;
}) {
  const colors = useColors();
  const initial = name.charAt(0).toUpperCase();
  const Wrapper: React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }> = onPress ? (Pressable as React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }>) : View;

  const avatarSize = compact ? 44 : 60;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.namePlate,
        {
          borderColor: isActive ? colors.neonGold : '#3a1a5e',
          shadowColor: isActive ? colors.neonGold : 'transparent',
          shadowOpacity: isActive ? 0.8 : 0,
          shadowRadius: 10,
          elevation: isActive ? 8 : 0,
          paddingVertical: compact ? 6 : 8,
          paddingHorizontal: compact ? 8 : 10,
        },
      ]}
    >
      <View
        style={[
          styles.avatarCircle,
          {
            borderColor: isActive ? colors.neonGold : colors.neonPurple,
            overflow: 'hidden',
            width: avatarSize,
            height: avatarSize,
            borderRadius: compact ? 10 : 14,
          },
        ]}
      >
        {portraitArt ? (
          <Image source={portraitArt} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="top" />
        ) : (
          <Text style={[styles.avatarText, { color: isActive ? colors.neonGold : colors.neonPurple, fontSize: compact ? 16 : 22 }]}>{initial}</Text>
        )}
      </View>
      <Text
        style={[
          styles.nameText,
          {
            color: '#ffffff',
            fontSize: compact ? 12 : 14,
            fontWeight: '900',
            marginTop: 6,
            textAlign: 'center',
            letterSpacing: 1,
            textShadowColor: '#000000',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 4,
          },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
      {showMenuDots ? (
        <View style={styles.menuDotsBadgeLs} pointerEvents="none">
          <Text style={styles.menuDotsTextLs}>⋯</Text>
        </View>
      ) : null}
    </Wrapper>
  );
}

/** Compact opponent card area (face-up row + face-down stack + back-of-hand fan) for landscape. */
function OpponentArea({ handCount, faceUp, faceDownCount }: { handCount: number; faceUp: CardType[]; faceDownCount: number }) {
  const colors = useColors();
  const handOverlap = handCount > 5 ? -32 : -20;

  // Opponent is in the final face-up phase when their hand is empty and they
  // still have face-up cards. Show a pulsing orange aura as a clear visual
  // warning to the player that the opponent is almost out of cards.
  const opponentInFinalPhase = handCount === 0 && faceUp.length > 0;

  return (
    <View style={styles.opponentArea}>
      <View style={styles.opponentHandRow}>
        {handCount > 0 && Array.from({ length: handCount }).map((_, i) => (
          <View
            key={i}
            style={{
              marginLeft: i === 0 ? 0 : handOverlap,
              transform: [{ rotate: `${(i - (handCount - 1) / 2) * 4}deg` }],
            }}
          >
            <CardBack size="sm" />
          </View>
        ))}
      </View>

      <View style={styles.opponentBoardRow}>
        <View style={styles.boardCol}>
          {Array.from({ length: faceDownCount }).map((_, i) => (
            <CardBack key={i} size="sm" style={{ marginLeft: i === 0 ? 0 : -22 }} />
          ))}
        </View>
        <View style={styles.boardCol}>
          {faceUp.map((card, i) => (
            <CardComponent key={card.id} card={card} size="sm" style={{ marginLeft: i === 0 ? 0 : -18 }} />
          ))}
        </View>
      </View>

      <View style={[styles.tagPill, { borderColor: '#3a1a5e' }]}>
        <Text style={[styles.tagPillText, { color: opponentInFinalPhase ? colors.neonGold : colors.mutedForeground }]}>
          {opponentInFinalPhase
            ? `✦ FINAL · ${faceUp.length} FACE-UP`
            : `${faceUp.length} FACE-UP · ${faceDownCount} FACE-DOWN`}
        </Text>
      </View>
    </View>
  );
}

/**
 * Landscape game layout. Composition (left → right):
 *   • Left column: opponent name plate (top), action buttons (mid), player name plate (bottom)
 *   • Center column: opponent avatar + cards (top), discard pile / GlowPile (mid), player hand (bottom)
 *   • Right column (narrow): DrawPileStack centered vertically
 */
export default function GameLandscape(): React.JSX.Element | null {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { 
    gameView, playerName, playCard, playCards, pickupPile: doPickup, clearGame, leaveGame, 
    opponentDisconnected, opponentReconnecting, sendEmote, myEmoteBubble, opponentEmoteBubble 
  } = useGame();
  const { isMuted, toggleMute, volumeLevel, setVolumeLevel } = useMusicPlayer();
  const [myEmote, setMyEmote] = useState<{ emote: string; key: number } | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<{ emote: string; key: number } | null>(null);
  useEffect(() => {
    if (myEmoteBubble) setMyEmote(myEmoteBubble);
  }, [myEmoteBubble]);
  useEffect(() => {
    if (opponentEmoteBubble) setOpponentEmote(opponentEmoteBubble);
  }, [opponentEmoteBubble]);
  const confirmLeave = (onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Bow out of this match? You will forfeit the game.')) onConfirm();
    } else {
      Alert.alert('Bow Out?', 'Leaving now forfeits the match. Your opponent will be notified.', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Forfeit', style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  // Tap-your-own-name-plate popover (Exit Game lives here).
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  const [lastEventType, setLastEventType] = useState<string | undefined>();
  const [reveal, setReveal] = useState<{ card: CardType; topCard: CardType | null; busted: boolean; who: string; key: string } | null>(null);
  const [burst, setBurst] = useState<{ card: CardType; count: number; who: string; key: string } | null>(null);
  // Initialize dedupe refs to the CURRENT lastEvent so a fresh mount (e.g.
  // after rotating from portrait → landscape mid-game) does not replay the
  // last haptic / shake / reveal that already fired before rotation.
  const initialEvent = gameView?.lastEvent;
  const initialRevealKey = initialEvent?.wasFaceDown && initialEvent?.card
    ? `${initialEvent.playerId}_${initialEvent.card.id}`
    : null;
  const initialBurstKey = !initialEvent?.wasFaceDown && initialEvent?.card && (initialEvent.playedCount ?? 1) >= 2
    ? `${initialEvent.playerId}_${initialEvent.card.id}_${initialEvent.playedCount}`
    : null;
  const lastRevealKeyRef = React.useRef<string | null>(initialRevealKey);
  const lastBurstKeyRef = React.useRef<string | null>(initialBurstKey);
  const lastHandledEventRef = React.useRef<unknown>(initialEvent ?? null);
  // Layout rects for CinematicPlay (landscape)
  const [pileRectLs, setPileRectLs] = useState<LayoutRect | null>(null);
  const [selfHandRectLs, setSelfHandRectLs] = useState<LayoutRect | null>(null);
  const [opponentZoneRectLs, setOpponentZoneRectLs] = useState<LayoutRect | null>(null);
  const selfHandRefLs = useRef<View>(null);
  const opponentZoneRefLs = useRef<View>(null);

  // Stable initial key so CinematicPlay does not replay the last event when
  // the landscape branch mounts (e.g. after rotating from portrait).
  const initialCinematicKeyRef = useRef<string | null>(
    initialEvent ? lastEventIdentityKey(gameView?.gameId ?? '', initialEvent) : null,
  );

  // Card draw animation — a CardBack flies from the draw pile to the hand
  const drawAnimX = useSharedValue(0);
  const drawAnimY = useSharedValue(0);
  const drawAnimOpacity = useSharedValue(0);
  const drawPileRef = useRef<DrawPileHandle>(null);

  // Drag-and-drop state
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const dragVisible = useSharedValue(0);
  const [draggingCard, setDraggingCard] = useState<CardType | null>(null);
  const draggingCardRef = useRef<CardType | null>(null);
  const [pileCenter, setPileCenter] = useState<{ x: number; y: number } | null>(null);
  const [pileHighlighted, setPileHighlighted] = useState(false);
  const tableCenterRef = useRef<View>(null);

  // Cosmetics — actual avatar portraits for name plates
  const cosmetics = useCosmetics();
  const myAvatarPortrait = useMemo(
    () => AVATARS.find((a) => a.id === cosmetics.avatarId)?.portrait ?? null,
    [cosmetics.avatarId],
  );

  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    if (!gameView) router.replace('/');
  }, [gameView]);

  useEffect(() => {
    if (gameView?.phase === 'finished') {
      const t = setTimeout(() => {
        router.replace({
          pathname: '/victory',
          params: { winner: gameView.winner, myId: gameView.myPlayerId, opponentName: gameView.opponentName },
        });
      }, 2700);
      return () => clearTimeout(t);
    }
  }, [gameView?.phase]);

  useEffect(() => {
    if (!gameView?.lastEvent) return;
    // Skip if this is the very same event reference we already processed
    // (typical when this component remounts due to orientation change).
    if (lastHandledEventRef.current === gameView.lastEvent) return;
    lastHandledEventRef.current = gameView.lastEvent;
    setLastEventType(gameView.lastEvent.type);
    const ev = gameView.lastEvent;
    if (ev.wasFaceDown && ev.card) {
      const key = `${ev.playerId}_${ev.card.id}`;
      if (lastRevealKeyRef.current !== key) {
        lastRevealKeyRef.current = key;
        const isMine = ev.playerId === gameView.myPlayerId;
        setReveal({
          card: ev.card,
          topCard: ev.previousTop ?? null,
          busted: ev.type === 'face_down_bust',
          who: isMine ? 'YOU' : (gameView.opponentName ?? 'OPPONENT'),
          key,
        });
      }
    }
    // DOUBLE!/TRIPLE!/QUADRUPLE! burst on multi-card plays. Skipped for
    // face-down reveals (those have their own dedicated animation).
    if (!ev.wasFaceDown && ev.card && (ev.playedCount ?? 1) >= 2) {
      const key = `${ev.playerId}_${ev.card.id}_${ev.playedCount}`;
      if (lastBurstKeyRef.current !== key) {
        lastBurstKeyRef.current = key;
        const isMine = ev.playerId === gameView.myPlayerId;
        setBurst({
          card: ev.card,
          count: ev.playedCount ?? 2,
          who: isMine ? 'YOU' : (gameView.opponentName ?? 'OPPONENT'),
          key,
        });
      }
    }
    if (ev.type === 'burn' || ev.type === 'set_complete') {
      // Single Medium haptic on burn/set_complete
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    } else if (ev.type === 'pickup') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [gameView?.lastEvent]);

  const opponentCoins = useMemo(() => fakeCoins(gameView?.opponentName ?? ''), [gameView?.opponentName]);

  // Card draw animation: fires only when the server explicitly stamps this
  // update with the local player as the drawer. `drawEventId` is a unique token
  // per draw event — consecutive draws by the same player each get a different
  // token, so the effect fires reliably every time.
  useEffect(() => {
    if (!gameView?.drawEventId || gameView.drawPlayerId !== gameView.myPlayerId) return;
    drawPileRef.current?.getPosition().then(({ x, y, width: w, height: h }) => {
      const startX = x + w / 2;
      const startY = y + h / 2;
      const endX = width / 2;
      const endY = height * 0.85;
      drawAnimX.value = startX - 20;
      drawAnimY.value = startY - 28;
      drawAnimOpacity.value = 1;
      drawAnimX.value = withTiming(endX - 20, { duration: 700, easing: Easing.out(Easing.cubic) });
      drawAnimY.value = withTiming(endY - 28, { duration: 700, easing: Easing.out(Easing.cubic) });
      drawAnimOpacity.value = withDelay(500, withTiming(0, { duration: 200 }));
    }).catch(() => {});
  }, [gameView?.drawEventId]);

  // Drag-and-drop handlers (passed to PlayerHand → HandCard)
  const handleDragStart = useCallback((card: CardType, x: number, y: number) => {
    draggingCardRef.current = card;
    setDraggingCard(card);
    dragX.value = x;
    dragY.value = y;
    dragStartX.value = x;
    dragStartY.value = y;
    dragVisible.value = withTiming(1, { duration: 80 });
  }, [dragX, dragY, dragStartX, dragStartY, dragVisible]);

  const handleDragMove = useCallback((x: number, y: number) => {
    dragX.value = x;
    dragY.value = y;
    // Highlight the pile when the card is within drop radius
    const drop = pileCenter;
    if (drop) {
      const dist = Math.sqrt(Math.pow(x - drop.x, 2) + Math.pow(y - drop.y, 2));
      setPileHighlighted(dist < 110);
    }
  }, [dragX, dragY, pileCenter]);

  const handleDragEnd = useCallback((x: number, y: number) => {
    const drop = pileCenter;
    const card = draggingCardRef.current;
    setPileHighlighted(false);
    if (drop && card) {
      const dist = Math.sqrt(Math.pow(x - drop.x, 2) + Math.pow(y - drop.y, 2));
      if (dist < 110) {
        // Successful drop — fade ghost out immediately
        playCard(card.id);
        dragVisible.value = withTiming(0, { duration: 100 });
        setTimeout(() => {
          setDraggingCard(null);
          draggingCardRef.current = null;
        }, 120);
        return;
      }
    }
    // Missed drop — spring ghost back to start position then fade
    dragX.value = withSpring(dragStartX.value, { damping: 20, stiffness: 200 });
    dragY.value = withSpring(dragStartY.value, { damping: 20, stiffness: 200 });
    dragVisible.value = withDelay(180, withTiming(0, { duration: 120 }));
    setTimeout(() => {
      setDraggingCard(null);
      draggingCardRef.current = null;
    }, 320);
  }, [pileCenter, playCard, dragX, dragY, dragStartX, dragStartY, dragVisible]);

  const dragCardStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: dragX.value - 28,
    top: dragY.value - 39,
    opacity: dragVisible.value,
    zIndex: 200,
    pointerEvents: 'none' as const,
  }));

  const drawAnimStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: drawAnimX.value,
    top: drawAnimY.value,
    opacity: drawAnimOpacity.value,
    zIndex: 150,
    pointerEvents: 'none' as const,
  }));

  if (!gameView) return null;

  const {
    myHand, myFaceUp, myFaceDownCount, myFaceDownIds, opponentHandCount, opponentFaceUp, opponentFaceDownCount,
    opponentName, discardPile, deckCount, isMyTurn, canFastPlay,
  } = gameView;

  // Opponent gets a deterministic avatar from the AVATARS list based on their name
  const opponentAvatarPortrait = AVATARS[hashName(opponentName) % AVATARS.length]?.portrait ?? null;

  const activeZone = myHand.length > 0 ? myHand : myFaceUp;
  const burnIds = activeZone.filter((c) => c.value === 10 && canPlayCard(c, discardPile)).map((c) => c.id);
  const resetIds = activeZone.filter((c) => c.value === 2 && canPlayCard(c, discardPile)).map((c) => c.id);
  const hasBurn = burnIds.length > 0;
  const hasReset = resetIds.length > 0;
  const handlePlayBurn = () => { if (burnIds.length > 0) playCards(burnIds); };
  const handlePlayReset = () => { if (resetIds.length > 0) playCards(resetIds); };
  const handleFastPlay = () => {
    if (!canFastPlay) return;
    const top = discardPile[discardPile.length - 1];
    if (!top) return;
    const sameIds = activeZone.filter((c) => c.value === top.value).map((c) => c.id);
    if (sameIds.length > 0) playCards(sameIds);
  };

  // Left column holds only action buttons now (name plates moved to absolute corners).
  const sideColW = Math.max(90, Math.min(130, width * 0.10));
  const drawColW = 100;

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background }]}>
      <SceneBackground />
      <BackButton
        label="← EXIT"
        onPress={() => confirmLeave(() => { leaveGame(); router.replace('/'); })}
        style={{ position: 'absolute', top: insets.top + webTopPad + 8, left: insets.left + 14, zIndex: 55 }}
      />

      {/* Opponent gamer tag — top-right corner, compact pill so it doesn't droop over cards */}
      <View style={{ position: 'absolute', top: insets.top + webTopPad + 8, right: insets.right + 14, zIndex: 50, maxWidth: 84 }}>
        <NamePlate
          name={opponentName}
          isActive={!isMyTurn}
          align="right"
          portraitArt={opponentAvatarPortrait}
          compact
        />
      </View>

      {/* Player gamer tag — bottom-left, raised so it sits near the action buttons */}
      <View style={{ position: 'absolute', bottom: insets.bottom + 72, left: insets.left + 14, zIndex: 50, maxWidth: 96 }}>
        <NamePlate
          name={playerName}
          isActive={isMyTurn}
          align="left"
          portraitArt={myAvatarPortrait}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setPlayerMenuOpen((o) => !o);
          }}
          showMenuDots
        />
      </View>

      <View
        style={[
          styles.layout,
          { paddingTop: insets.top + webTopPad + 4, paddingBottom: insets.bottom + 4, paddingHorizontal: 8 },
        ]}
      >
        {/* LEFT COLUMN — action buttons only (name plates are now corner overlays) */}
        <View style={[styles.leftColumn, { width: sideColW }]}>
          <View style={styles.actionStackInline}>
            {/* Action buttons hide during STARTER mode — tap a hand card directly. */}
            {!gameView.mustPlayStarter && (
              <ActionButtons
                canPickup={discardPile.length > 0}
                hasBurn={hasBurn}
                hasReset={hasReset}
                canFastPlay={canFastPlay}
                isMyTurn={isMyTurn}
                onPickup={doPickup}
                onPlayBurn={handlePlayBurn}
                onPlayReset={handlePlayReset}
                onFastPlay={handleFastPlay}
              />
            )}
          </View>
        </View>

        {/* CENTER COLUMN — opponent (top) → pile (mid) → player hand (bottom) */}
        <View style={styles.centerColumn}>
          <View
            ref={opponentZoneRefLs}
            style={styles.opponentTopRow}
            onLayout={() => {
              opponentZoneRefLs.current?.measure((_x, _y, w, h, pageX, pageY) => {
                const r = { x: pageX, y: pageY, width: w, height: h };
                setOpponentZoneRectLs((prev) => (layoutRectsCloseEnough(prev, r) ? prev : r));
              });
            }}
          >
            <OpponentArea
              handCount={opponentHandCount}
              faceUp={opponentFaceUp}
              faceDownCount={opponentFaceDownCount}
            />
          </View>

          <View
            ref={tableCenterRef}
            style={styles.tableCenter}
            onLayout={() => {
              tableCenterRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
                setPileCenter({ x: pageX + w / 2, y: pageY + h / 2 });
                const r = { x: pageX, y: pageY, width: w, height: h };
                setPileRectLs((prev) => (layoutRectsCloseEnough(prev, r) ? prev : r));
              });
            }}
          >
            <GlowPile pile={discardPile} lastEventType={lastEventType} highlighted={pileHighlighted} />
          </View>

          <View
            ref={selfHandRefLs}
            style={styles.playerHandSection}
            onLayout={() => {
              selfHandRefLs.current?.measure((_x, _y, w, h, pageX, pageY) => {
                const r = { x: pageX, y: pageY, width: w, height: h };
                setSelfHandRectLs((prev) => (layoutRectsCloseEnough(prev, r) ? prev : r));
              });
            }}
          >
            <PlayerHand
              hand={myHand}
              faceUp={myFaceUp}
              faceDownCount={myFaceDownCount}
              faceDownIds={myFaceDownIds ?? []}
              discardPile={discardPile}
              isMyTurn={isMyTurn}
              onPlayCard={playCard}
              onPlayCards={playCards}
              mustPlayStarter={gameView.mustPlayStarter}
              draggable={isMyTurn && myHand.length > 0}
              onDragStart={handleDragStart}
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
            />
          </View>
        </View>

        {/* RIGHT COLUMN — draw pile (no hero art) */}
        <View style={[styles.drawPileColumn, { width: drawColW }]}>
          <DrawPileStack ref={drawPileRef} count={deckCount} />
        </View>
      </View>

      {/* Floating drag ghost card — follows finger while dragging */}
      {draggingCard && (
        <Animated.View style={dragCardStyle} pointerEvents="none">
          <CardComponent card={draggingCard} size="md" />
        </Animated.View>
      )}

      {/* Flying card draw animation overlay */}
      <Animated.View style={drawAnimStyle} pointerEvents="none">
        <CardBack size="sm" />
      </Animated.View>

      {reveal && (
        <FaceDownReveal
          key={reveal.key}
          card={reveal.card}
          topCard={reveal.topCard}
          busted={reveal.busted}
          who={reveal.who}
          onComplete={() => setReveal(null)}
        />
      )}

      {burst && (
        <MultiPlayBurst
          key={burst.key}
          card={burst.card}
          count={burst.count}
          who={burst.who}
          onComplete={() => setBurst(null)}
        />
      )}

      <EmotePicker onSend={sendEmote} />

      {opponentReconnecting && !opponentDisconnected && (
        <View style={[styles.disconnectBanner, { backgroundColor: colors.card, borderColor: colors.neonGold }]}>
          <Text style={[styles.disconnectText, { color: colors.neonGold }]}>Opponent reconnecting…</Text>
          <Pressable onPress={() => { leaveGame(); router.replace('/'); }}>
            <Text style={[styles.disconnectLeave, { color: colors.mutedForeground }]}>Give up</Text>
          </Pressable>
        </View>
      )}

      {opponentDisconnected && (
        <View style={[styles.disconnectBanner, { backgroundColor: colors.card, borderColor: colors.accent }]}>
          <Text style={[styles.disconnectText, { color: colors.accent }]}>Opponent disconnected</Text>
          <Pressable onPress={() => { clearGame(); router.replace('/'); }}>
            <Text style={[styles.disconnectLeave, { color: colors.primary }]}>Leave</Text>
          </Pressable>
        </View>
      )}

      {myEmote ? (
        <EmoteBubble
          key={`me_${myEmote.key}`}
          emote={myEmote.emote}
          side="left"
        />
      ) : null}
      {opponentEmote ? (
        <EmoteBubble
          key={`op_${opponentEmote.key}`}
          emote={opponentEmote.emote}
          side="right"
        />
      ) : null}

      {/* Cinematic card-flight overlay — spotlight + Bezier arc + 3D tilt + impact sparks */}
      {gameView && (
        <CinematicPlay
          gameId={gameView.gameId}
          lastEvent={gameView.lastEvent}
          myPlayerId={gameView.myPlayerId}
          pileRect={pileRectLs}
          selfHandRect={selfHandRectLs}
          opponentZoneRect={opponentZoneRectLs}
          onAvatarPulse={() => {}}
          initialLastKey={initialCinematicKeyRef.current}
        />
      )}

      {/* Player menu popover (Exit Game). Anchored over the player name plate
          on the left column, just below where the plate sits. Tap backdrop to
          close. */}
      {playerMenuOpen && (
        <>
          <Pressable
            onPress={() => setPlayerMenuOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              styles.playerMenuLs,
              { left: insets.left + 16, bottom: insets.bottom + 146 },
            ]}
          >
            {/* Volume gauge — 4 tappable segments + mute toggle */}
            <View style={styles.playerMenuItemLs}>
              <Text style={styles.playerMenuIconLs}>🎵</Text>
              <View style={styles.volumeGaugeRow}>
                {([0.25, 0.5, 0.75, 1.0] as const).map((level) => {
                  // Always show the stored level even when muted so the user
                  // can see (and change) it without toggling sound on first.
                  const selected = volumeLevel >= level;
                  const dimmed   = selected && isMuted;
                  return (
                    <Pressable
                      key={level}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setVolumeLevel(level);
                        // Unmute if tapping a level while muted
                        if (isMuted) toggleMute();
                      }}
                      style={[
                        styles.volumeSegment,
                        selected
                          ? dimmed ? styles.volumeSegmentMuted : styles.volumeSegmentActive
                          : styles.volumeSegmentInactive,
                      ]}
                    >
                      <Text style={[
                        styles.volumeSegmentLabel,
                        { color: selected ? (dimmed ? '#7a5a9e' : '#e0c8ff') : '#4a2a6e' },
                      ]}>
                        {level === 0.25 ? '25' : level === 0.5 ? '50' : level === 0.75 ? '75' : '100'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleMute();
                }}
                style={styles.muteButton}
              >
                <Text style={{ fontSize: 15 }}>{isMuted ? '🔇' : '🔊'}</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => {
                setPlayerMenuOpen(false);
                confirmLeave(() => { leaveGame(); router.replace('/'); });
              }}
              style={styles.playerMenuItemLs}
            >
              <Text style={styles.playerMenuIconLs}>🚪</Text>
              <Text style={styles.playerMenuLabelLs}>EXIT GAME</Text>
            </Pressable>
          </View>
        </>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  layout: { flex: 1, flexDirection: 'row', gap: 8 },

  menuDotsBadgeLs: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3a1a5e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDotsTextLs: {
    fontSize: 11,
    fontWeight: '900',
    color: '#e0c8ff',
    lineHeight: 13,
    marginTop: -4,
  },
  playerMenuLs: {
    position: 'absolute',
    minWidth: 160,
    backgroundColor: '#1a0535f5',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#5b1a8c',
    paddingVertical: 6,
    zIndex: 60,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  playerMenuItemLs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  playerMenuIconLs: { fontSize: 16 },
  playerMenuLabelLs: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#ff4d6d',
  },

  volumeGaugeRow: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  volumeSegment: {
    flex: 1,
    height: 22,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  volumeSegmentActive: {
    backgroundColor: '#5b1a8c',
    borderColor: '#b060ff',
  },
  volumeSegmentMuted: {
    backgroundColor: '#2a1045',
    borderColor: '#5a3a7e',
  },
  volumeSegmentInactive: {
    backgroundColor: '#1a0535',
    borderColor: '#3a1a5e',
  },
  volumeSegmentLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  muteButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a0535',
    borderWidth: 1,
    borderColor: '#3a1a5e',
    marginLeft: 4,
  },

  namePlateSlot: {
    position: 'relative',
  },
  leftColumn: {
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  actionStackInline: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    paddingVertical: 4,
  },
  drawPileColumn: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  centerColumn: { flex: 1, justifyContent: 'space-between', paddingVertical: 4 },

  opponentTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 8,
  },
  opponentArtFrame: {
    width: 110,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#3a1a5e',
  },
  opponentArea: { flex: 1, alignItems: 'center', gap: 4 },
  opponentHandRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', minHeight: 56 },
  opponentBoardRow: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: -4 },
  boardCol: { flexDirection: 'row', alignItems: 'center' },

  tableCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  playerHandSection: { paddingHorizontal: 4, marginBottom: 14, overflow: 'visible' },

  namePlate: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#0d001ad9',
    borderRadius: 14,
    borderWidth: 1.5,
    width: '100%',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: { fontSize: 16, fontWeight: '900' },
  nameTextWrap: { flex: 1, justifyContent: 'center' },
  nameText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  levelText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 3 },
  statText: { fontSize: 10, fontWeight: '800' },

  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignSelf: 'center',
  },
  tagPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.2 },

  placeholderInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  placeholderText: { fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  placeholderSub: { fontSize: 9, fontWeight: '600', letterSpacing: 2 },

  disconnectBanner: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disconnectText: { fontSize: 14, fontWeight: '600' },
  disconnectLeave: { fontSize: 14, fontWeight: '700' },
});
