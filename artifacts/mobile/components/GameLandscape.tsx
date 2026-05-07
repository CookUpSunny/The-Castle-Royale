import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Card as CardType, useGame } from '@/contexts/GameContext';
import { useCosmetics } from '@/contexts/CosmeticsContext';
import { useMusicPlayer } from '@/contexts/MusicContext';
import { useColors } from '@/hooks/useColors';
import ActionButtons from '@/components/ActionButtons';
import CardComponent, { CardBack } from '@/components/Card';
import SceneBackground from '@/components/SceneBackground';
import EmoteBubble from '@/components/EmoteBubble';
import EmotePicker from '@/components/EmotePicker';
import FaceDownReveal from '@/components/FaceDownReveal';
import MultiPlayBurst from '@/components/MultiPlayBurst';
import GlowPile from '@/components/GlowPile';
import PlayerHand from '@/components/PlayerHand';

// AI-generated anime casino art bundled with the app.
// Metro requires static require() paths inside the artifact root, so the
// originals from attached_assets/casino/ are copied into ./assets/casino/.
const TABLE_BG = require('../assets/casino/table_backdrop_neon.png');
const HERO_POV = require('../assets/casino/hero_player_pov.png');
const OPPONENT_ART = require('../assets/casino/opponent_silver.png');

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
function NamePlate({ name, level, coins, gems, isActive, align, portraitArt, onPress, showMenuDots }: {
  name: string;
  level: string;
  coins: string;
  gems?: string;
  isActive: boolean;
  align: 'left' | 'right';
  portraitArt?: number | null;
  onPress?: () => void;
  showMenuDots?: boolean;
}) {
  const colors = useColors();
  const initial = name.charAt(0).toUpperCase();
  const Wrapper: React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }> = onPress ? (Pressable as React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }>) : View;
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
          flexDirection: align === 'left' ? 'row' : 'row-reverse',
        },
      ]}
    >
      <View
        style={[
          styles.avatarCircle,
          { borderColor: isActive ? colors.neonGold : colors.neonPurple, overflow: 'hidden' },
        ]}
      >
        {portraitArt ? (
          <Image source={portraitArt} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <Text style={[styles.avatarText, { color: isActive ? colors.neonGold : colors.neonPurple }]}>{initial}</Text>
        )}
      </View>
      <View style={[styles.nameTextWrap, align === 'right' && { alignItems: 'flex-end' }]}>
        <Text style={[styles.nameText, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.levelText, { color: colors.mutedForeground }]}>{level}</Text>
        <View style={[styles.statsRow, align === 'right' && { flexDirection: 'row-reverse' }]}>
          <Text style={[styles.statText, { color: colors.neonGold }]}>🪙 {coins}</Text>
          {gems ? <Text style={[styles.statText, { color: colors.electric }]}>💎 {gems}</Text> : null}
        </View>
      </View>
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

  const pulse = useSharedValue(0.3);
  useEffect(() => {
    if (!opponentInFinalPhase) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.2, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, opponentInFinalPhase]);

  const auraStyle = useAnimatedStyle(() => ({
    shadowOpacity: pulse.value,
    borderColor: `rgba(251, 146, 60, ${pulse.value})`,
  }));

  return (
    <View style={styles.opponentArea}>
      {handCount > 0 && (
        <View style={styles.opponentHandRow}>
          {Array.from({ length: handCount }).map((_, i) => (
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
      )}

      {/* Face-up card group — wrapped in a pulsing orange aura during the final phase. */}
      <View style={styles.opponentBoardRow}>
        <View style={styles.boardCol}>
          {Array.from({ length: faceDownCount }).map((_, i) => (
            <CardBack key={i} size="sm" style={{ marginLeft: i === 0 ? 0 : -22 }} />
          ))}
        </View>
        <Animated.View
          style={[
            styles.boardCol,
            opponentInFinalPhase && {
              borderRadius: 8,
              borderWidth: 2,
              paddingHorizontal: 4,
              paddingVertical: 2,
              shadowColor: '#f97316',
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 0 },
              elevation: 8,
            },
            opponentInFinalPhase ? auraStyle : undefined,
          ]}
        >
          {faceUp.map((card, i) => (
            <CardComponent key={card.id} card={card} size="sm" style={{ marginLeft: i === 0 ? 0 : -18 }} />
          ))}
        </Animated.View>
      </View>

      {/* Status pill — turns orange with a ⚠ warning in the final phase. */}
      <View style={[styles.tagPill, { borderColor: opponentInFinalPhase ? '#f97316' : '#3a1a5e' }]}>
        {opponentInFinalPhase ? (
          <Text style={[styles.tagPillText, { color: '#fb923c', fontWeight: '900' }]}>
            ⚠ FINAL PHASE · {faceUp.length} FACE-UP
          </Text>
        ) : (
          <Text style={[styles.tagPillText, { color: colors.mutedForeground }]}>
            {faceUp.length} FACE-UP · {faceDownCount} FACE-DOWN
          </Text>
        )}
      </View>
    </View>
  );
}

function DeckBadge({ count }: { count: number }) {
  const colors = useColors();
  return (
    <View style={styles.deckBadgeWrap}>
      <View style={styles.deckStack}>
        {[2, 1, 0].map((offset) => (
          <View
            key={offset}
            style={[styles.deckCard, { top: -offset * 2, left: -offset * 2, borderColor: colors.neonGold }]}
          />
        ))}
        <View style={styles.deckLogo}>
          <Text style={[styles.deckLogoText, { color: colors.neonGold }]}>✦</Text>
          <Text style={[styles.deckLogoSub, { color: colors.neonGold }]}>CASTLE</Text>
          <Text style={[styles.deckLogoSub, { color: colors.neonGold }]}>ROYALE</Text>
        </View>
      </View>
      <View style={[styles.tagPill, { borderColor: '#3a1a5e', marginTop: 4 }]}>
        <Text style={[styles.tagPillText, { color: colors.neonGold }]}>DRAW</Text>
        <Text style={[styles.deckCount, { color: colors.foreground }]}>{count}</Text>
      </View>
    </View>
  );
}

/**
 * Landscape game layout — third-person over-the-shoulder POV inspired by the
 * cinematic anime mockup. Composition (left → right):
 *   • Hero character art column on the left (over-shoulder silhouette)
 *   • Action buttons stacked top-to-bottom on the inner left edge
 *   • Center column: opponent character + opponent cards (top), discard pile (mid), player hand (bottom)
 *   • Right column: opponent name plate (top), draw deck (mid), player name plate (bottom)
 *
 * Falls back to gradient placeholder frames when the AI-generated art assets
 * are not yet present in attached_assets/casino/.
 */
export default function GameLandscape(): React.JSX.Element | null {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { gameView, playerName, playCard, playCards, pickupPile: doPickup, clearGame, leaveGame, opponentDisconnected, sendEmote, myEmoteBubble, opponentEmoteBubble } = useGame();
  const { arena } = useCosmetics();
  const { isMuted, toggleMute } = useMusicPlayer();
  const [myEmote, setMyEmote] = useState<{ emote: string; key: number } | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<{ emote: string; key: number } | null>(null);
  useEffect(() => {
    if (myEmoteBubble) setMyEmote(myEmoteBubble);
  }, [myEmoteBubble]);
  useEffect(() => {
    if (opponentEmoteBubble) setOpponentEmote(opponentEmoteBubble);
  }, [opponentEmoteBubble]);
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
  const fireScale = useSharedValue(0.3);
  const fireOpacity = useSharedValue(0);
  const ring1Scale = useSharedValue(0.3);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.3);
  const ring2Opacity = useSharedValue(0);
  const ring3Scale = useSharedValue(0.3);
  const ring3Opacity = useSharedValue(0);

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
      // 3× Heavy haptic at 0, 200, 700 ms — no camera shake
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 700);
      // Fire burst (radial scale — NO translateX/Y shake)
      fireScale.value = 0.3;
      fireOpacity.value = 0.9;
      fireScale.value = withTiming(2.5, { duration: 850 });
      fireOpacity.value = withTiming(0, { duration: 850 });
      ring1Scale.value = 0.3; ring1Opacity.value = 0.8;
      ring1Scale.value = withTiming(2.0, { duration: 700 });
      ring1Opacity.value = withTiming(0, { duration: 700 });
      setTimeout(() => {
        ring2Scale.value = 0.3; ring2Opacity.value = 0.7;
        ring2Scale.value = withTiming(2.0, { duration: 700 });
        ring2Opacity.value = withTiming(0, { duration: 700 });
      }, 120);
      setTimeout(() => {
        ring3Scale.value = 0.3; ring3Opacity.value = 0.6;
        ring3Scale.value = withTiming(2.0, { duration: 700 });
        ring3Opacity.value = withTiming(0, { duration: 700 });
      }, 240);
    } else if (ev.type === 'pickup') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [gameView?.lastEvent]);

  const fireStyle = useAnimatedStyle(() => ({ transform: [{ scale: fireScale.value }], opacity: fireOpacity.value }));
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value }));
  const ring3Style = useAnimatedStyle(() => ({ transform: [{ scale: ring3Scale.value }], opacity: ring3Opacity.value }));

  const opponentCoins = useMemo(() => fakeCoins(gameView?.opponentName ?? ''), [gameView?.opponentName]);

  if (!gameView) return null;

  const {
    myHand, myFaceUp, myFaceDownCount, myFaceDownIds, opponentHandCount, opponentFaceUp, opponentFaceDownCount,
    opponentName, discardPile, deckCount, isMyTurn, canFastPlay, spectatorCount,
  } = gameView;

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

  // Column widths — tuned so the table center (cards) gets the most real estate.
  const heroColW = Math.max(140, Math.min(220, width * 0.18));
  const sideColW = Math.max(160, Math.min(220, width * 0.16));

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.background }]}>
      <SceneBackground />
      {(spectatorCount ?? 0) > 0 && (
        <View style={styles.spectatorBadge} pointerEvents="none">
          <Text style={styles.spectatorBadgeText}>👁 {spectatorCount} watching</Text>
        </View>
      )}
      <View
        style={[
          styles.layout,
          { paddingTop: insets.top + webTopPad + 4, paddingBottom: insets.bottom + 4, paddingHorizontal: 8 },
        ]}
      >
        {/* LEFT COLUMN — name plates + action buttons (no character art behind so the controls breathe) */}
        <View style={[styles.leftColumn, { width: sideColW }]}>
          <View style={styles.namePlateSlot}>
            <NamePlate
              name={opponentName}
              level="Lv. 28"
              coins={opponentCoins}
              isActive={!isMyTurn}
              align="left"
              portraitArt={OPPONENT_ART}
            />
          </View>
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
          <View style={styles.namePlateSlot}>
            <NamePlate
              name={playerName}
              level="Lv. 34"
              coins="125,000"
              gems="8,450"
              isActive={isMyTurn}
              align="left"
              portraitArt={HERO_POV}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPlayerMenuOpen((o) => !o);
              }}
              showMenuDots
            />
          </View>
        </View>

        {/* CENTER COLUMN — opponent (top) → pile (mid) → player hand (bottom) */}
        <View style={styles.centerColumn}>
          <View style={styles.opponentTopRow}>
            <View style={styles.opponentArtFrame}>
              <Image source={OPPONENT_ART} style={StyleSheet.absoluteFillObject} contentFit="cover" contentPosition="top" />
            </View>
            <OpponentArea
              handCount={opponentHandCount}
              faceUp={opponentFaceUp}
              faceDownCount={opponentFaceDownCount}
            />
          </View>

          <View style={styles.tableCenter}>
            <GlowPile pile={discardPile} lastEventType={lastEventType} />
          </View>

          <View style={styles.playerHandSection}>
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
            />
          </View>
        </View>

        {/* RIGHT COLUMN — over-the-shoulder hero art + draw deck overlay */}
        <View style={[styles.heroColumn, { width: heroColW }]}>
          <View style={styles.heroArtFrame}>
            <Image
              source={HERO_POV}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              contentPosition="left"
            />
            {/* Left-edge fade so the silhouette blends into the table center */}
            <LinearGradient
              colors={['rgba(7,0,15,0.85)', 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          </View>
          {/* Draw deck floats over the hero column's upper-right corner */}
          <View style={styles.deckOverlay}>
            <DeckBadge count={deckCount} />
          </View>
        </View>
      </View>

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
          onComplete={() => setMyEmote(null)}
        />
      ) : null}
      {opponentEmote ? (
        <EmoteBubble
          key={`op_${opponentEmote.key}`}
          emote={opponentEmote.emote}
          side="right"
          onComplete={() => setOpponentEmote(null)}
        />
      ) : null}

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
              { left: insets.left + 16, bottom: insets.bottom + 12 },
            ]}
          >
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleMute();
              }}
              style={styles.playerMenuItemLs}
            >
              <Text style={styles.playerMenuIconLs}>{isMuted ? '🔇' : '🔊'}</Text>
              <Text style={[styles.playerMenuLabelLs, { color: isMuted ? '#6b5a7e' : '#e0c8ff' }]}>
                {isMuted ? 'SOUND OFF' : 'SOUND ON'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setPlayerMenuOpen(false);
                const onConfirm = () => { leaveGame(); router.replace('/'); };
                if (Platform.OS === 'web') {
                  if (typeof window !== 'undefined' && window.confirm('Bow out of this match? You will forfeit the game.')) onConfirm();
                } else {
                  Alert.alert('Bow Out?', 'Leaving now forfeits the match. Your opponent will be notified.', [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Forfeit', style: 'destructive', onPress: onConfirm },
                  ]);
                }
              }}
              style={styles.playerMenuItemLs}
            >
              <Text style={styles.playerMenuIconLs}>🚪</Text>
              <Text style={styles.playerMenuLabelLs}>EXIT GAME</Text>
            </Pressable>
          </View>
        </>
      )}
      {/* Fire burst + ripple — radial scale, NO translateX/Y shake */}
      <Animated.View style={[styles.fireOverlay, fireStyle]} pointerEvents="none">
        <LinearGradient colors={['#ff7f0000', '#ff7f00cc', '#ff000090']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.ringOverlay, ring1Style]} pointerEvents="none">
        <LinearGradient colors={['transparent', '#ff6b00a0', 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.ringOverlay, ring2Style]} pointerEvents="none">
        <LinearGradient colors={['transparent', '#ff4d0070', 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.ringOverlay, ring3Style]} pointerEvents="none">
        <LinearGradient colors={['transparent', '#ff000050', 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
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
  heroColumn: { height: '100%', position: 'relative' },
  heroArtFrame: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3a1a5e',
  },
  deckOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
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

  playerHandSection: { paddingHorizontal: 4 },

  namePlate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#0d001ad9',
    borderRadius: 12,
    borderWidth: 1.5,
    width: '100%',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '900' },
  nameTextWrap: { flex: 1, justifyContent: 'center' },
  nameText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  levelText: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, marginTop: 1 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 3 },
  statText: { fontSize: 10, fontWeight: '800' },

  deckBadgeWrap: { alignItems: 'center', gap: 4 },
  deckStack: { width: 60, height: 84, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  deckCard: {
    position: 'absolute',
    width: 60,
    height: 84,
    borderRadius: 6,
    borderWidth: 1.2,
    backgroundColor: '#1a0535',
  },
  deckLogo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  deckLogoText: { fontSize: 18, fontWeight: '900' },
  deckLogoSub: { fontSize: 7, fontWeight: '900', letterSpacing: 1, lineHeight: 9 },
  deckCount: { fontSize: 13, fontWeight: '900', marginLeft: 4 },

  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#10002850',
  },
  tagPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

  placeholderInner: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  placeholderText: { fontSize: 14, fontWeight: '900', letterSpacing: 3 },
  placeholderSub: { fontSize: 9, fontWeight: '600', letterSpacing: 2 },

  spectatorBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#1a053590',
    borderWidth: 1,
    borderColor: '#5b1a8c',
    zIndex: 40,
  },
  spectatorBadgeText: { fontSize: 11, fontWeight: '700', color: '#e0c8ff', letterSpacing: 0.5 },
  fireOverlay: {
    position: 'absolute',
    top: '30%',
    left: '25%',
    right: '25%',
    bottom: '30%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  ringOverlay: {
    position: 'absolute',
    top: '20%',
    left: '15%',
    right: '15%',
    bottom: '20%',
    borderRadius: 999,
    overflow: 'hidden',
  },
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
