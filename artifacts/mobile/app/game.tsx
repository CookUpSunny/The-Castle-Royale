import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
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
import { Image } from 'expo-image';
import { type Card as CardType, useGame } from '@/contexts/GameContext';
import { AVATARS, useCosmetics } from '@/contexts/CosmeticsContext';
import { useMusicPlayer } from '@/contexts/MusicContext';
import { useColors } from '@/hooks/useColors';
import ActionButtons from '@/components/ActionButtons';
import BackButton from '@/components/BackButton';
import SceneBackground from '@/components/SceneBackground';
import CardComponent, { CardBack } from '@/components/Card';
import CinematicPlay from '@/components/CinematicPlay';
import type { LayoutRect } from '@/components/CardPlayFlight';
import EmoteBubble from '@/components/EmoteBubble';
import EmotePicker from '@/components/EmotePicker';
import FaceDownReveal from '@/components/FaceDownReveal';
import GameLandscape from '@/components/GameLandscape';
import GlowPile from '@/components/GlowPile';
import MultiPlayBurst from '@/components/MultiPlayBurst';
import OrientationCurtain from '@/components/OrientationCurtain';
import PlayerHand from '@/components/PlayerHand';
import SetupScreen from '@/components/SetupScreen';
import { lastEventIdentityKey } from '@/lib/lastEventDedupe';
import { layoutRectsCloseEnough } from '@/lib/layoutRect';

const { height: SCREEN_H } = Dimensions.get('window');

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

interface PlayerInfoCardProps {
  name: string;
  level: string;
  coins: string;
  gems?: string;
  isActive: boolean;
  align: 'left' | 'right';
}

function PlayerInfoCard({ name, level, coins, gems, isActive, align, onPress, showMenuDots }: PlayerInfoCardProps & { onPress?: () => void; showMenuDots?: boolean }) {
  const colors = useColors();
  const initial = name.charAt(0).toUpperCase();

  const Wrapper: React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }> = onPress ? (Pressable as React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }>) : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.infoCard,
        {
          borderColor: isActive ? colors.neonGold : '#3a1a5e',
          shadowColor: isActive ? colors.neonGold : 'transparent',
          shadowOpacity: isActive ? 0.7 : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 0 },
          elevation: isActive ? 6 : 0,
          flexDirection: align === 'left' ? 'row' : 'row-reverse',
        },
      ]}
    >
      <View
        style={[
          styles.avatarCircle,
          {
            borderColor: isActive ? colors.neonGold : colors.neonPurple,
            backgroundColor: isActive ? '#3a200870' : '#1a0535',
          },
        ]}
      >
        <Text style={[styles.avatarText, { color: isActive ? colors.neonGold : colors.neonPurple }]}>{initial}</Text>
      </View>
      <View style={[styles.infoTextWrap, align === 'right' && { alignItems: 'flex-end' }]}>
        <Text style={[styles.infoName, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.infoLevel, { color: colors.mutedForeground }]}>{level}</Text>
        <View style={[styles.statsRow, align === 'right' && { flexDirection: 'row-reverse' }]}>
          <View style={styles.statChip}>
            <Text style={styles.statIcon}>🪙</Text>
            <Text style={[styles.statText, { color: colors.neonGold }]}>{coins}</Text>
          </View>
          {gems ? (
            <View style={styles.statChip}>
              <Text style={styles.statIcon}>💎</Text>
              <Text style={[styles.statText, { color: colors.electric }]}>{gems}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {showMenuDots ? (
        <View style={[styles.menuDotsBadge, align === 'left' ? { right: 6 } : { left: 6 }]} pointerEvents="none">
          <Text style={styles.menuDotsText}>⋯</Text>
        </View>
      ) : null}
    </Wrapper>
  );
}

function AvatarChip({ name, isActive, portraitArt, onPress }: {
  name: string;
  isActive: boolean;
  portraitArt?: number | null;
  onPress?: () => void;
}) {
  const colors = useColors();
  const initial = name.charAt(0).toUpperCase();
  const glow = useSharedValue(0.2);

  useEffect(() => {
    if (!isActive) {
      glow.value = withTiming(0.18, { duration: 400 });
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.35, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(glow);
  }, [isActive, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
  }));

  const Wrapper: React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }> = onPress ? (Pressable as React.ComponentType<React.ComponentProps<typeof View> & { onPress?: () => void }>) : View;

  return (
    <Wrapper onPress={onPress}>
      <Animated.View
        style={[
          avatarChipStyles.chip,
          {
            borderColor: isActive ? colors.neonGold : colors.neonPurple,
            shadowColor: isActive ? colors.neonGold : colors.neonPurple,
          },
          glowStyle,
        ]}
      >
        {portraitArt ? (
          <Image source={portraitArt} style={StyleSheet.absoluteFillObject} contentFit="cover" />
        ) : (
          <Text style={[avatarChipStyles.initial, { color: isActive ? colors.neonGold : colors.neonPurple }]}>
            {initial}
          </Text>
        )}
      </Animated.View>
    </Wrapper>
  );
}

const avatarChipStyles = StyleSheet.create({
  chip: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    backgroundColor: '#0d001ad9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    elevation: 8,
  },
  initial: {
    fontSize: 22,
    fontWeight: '900',
  },
});

function DeckBadge({ count }: { count: number }) {
  const colors = useColors();
  return (
    <View style={styles.deckBadgeWrap}>
      <View style={styles.deckStack}>
        {[2, 1, 0].map((offset) => (
          <View
            key={offset}
            style={[
              styles.deckCard,
              {
                top: -offset * 2,
                left: -offset * 2,
                borderColor: colors.neonGold,
                backgroundColor: '#1a0535',
              },
            ]}
          />
        ))}
        <View style={styles.deckLogo}>
          <Text style={[styles.deckLogoText, { color: colors.neonGold }]}>✦</Text>
          <Text style={[styles.deckLogoSub, { color: colors.neonGold }]}>CASTLE</Text>
          <Text style={[styles.deckLogoSub, { color: colors.neonGold }]}>ROYALE</Text>
        </View>
      </View>
      <View style={[styles.deckTagPill, { borderColor: '#3a1a5e' }]}>
        <Text style={[styles.deckTagTitle, { color: colors.neonGold }]}>DRAW DECK</Text>
        <Text style={[styles.deckTagCount, { color: colors.foreground }]}>{count}</Text>
      </View>
    </View>
  );
}

function OpponentCardArea({ handCount, faceUp, faceDownCount }: { handCount: number; faceUp: CardType[]; faceDownCount: number }) {
  const colors = useColors();
  const handOverlap = handCount > 4 ? -28 : -16;
  return (
    <View style={styles.opponentCardArea}>
      {handCount > 0 && (
        <View style={styles.opponentHandRow}>
          {Array.from({ length: handCount }).map((_, i) => (
            <View key={i} style={{ marginLeft: i === 0 ? 0 : handOverlap, transform: [{ rotate: `${(i - (handCount - 1) / 2) * 4}deg` }] }}>
              <CardBack size="sm" />
            </View>
          ))}
        </View>
      )}
      <View style={styles.faceDownRow}>
        {Array.from({ length: faceDownCount }).map((_, i) => (
          <CardBack key={i} size="sm" style={{ marginLeft: i === 0 ? 0 : -18 }} />
        ))}
      </View>
      <View style={styles.faceUpRow}>
        {faceUp.map((card, i) => (
          <CardComponent
            key={card.id}
            card={card}
            size="sm"
            style={{ marginLeft: i === 0 ? 0 : -16 }}
          />
        ))}
      </View>
      <View style={[styles.opponentCardTag, { borderColor: '#3a1a5e' }]}>
        <Text style={[styles.opponentCardTagText, { color: colors.mutedForeground }]}>
          {handCount} HAND · {faceUp.length} FACE-UP · {faceDownCount} FACE-DOWN
        </Text>
      </View>
    </View>
  );
}


/**
 * Cross-platform forfeit confirm. On native we use the system Alert dialog;
 * on web Alert.alert is a no-op so we fall back to window.confirm so the
 * dialog actually appears in the browser preview.
 */
function confirmLeave(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm('Bow out of this match? You will forfeit the game.')) {
      onConfirm();
    }
    return;
  }
  Alert.alert(
    'Bow Out?',
    'Leaving now forfeits the match. Your opponent will be notified.',
    [
      { text: 'Stay', style: 'cancel' },
      { text: 'Forfeit', style: 'destructive', onPress: onConfirm },
    ],
  );
}

export default function GameScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Switch to the cinematic landscape layout whenever the device is wider than tall.
  // Lobby/setup/portrait stays unchanged so existing flows are unaffected.
  const isLandscape = width > height;

  // ── Orientation curtain state ──────────────────────────────────────────────
  // `committedLandscape` tracks which layout is actually rendered behind the
  // curtain. It lags behind `isLandscape` by the curtain's midpoint timing,
  // so the layout swap always happens while the card covers the screen.
  const [committedLandscape, setCommittedLandscape] = useState(isLandscape);
  const [curtain, setCurtain] = useState<{ toDirection: 'landscape' | 'portrait'; key: number } | null>(null);
  const prevIsLandscapeRef = useRef(isLandscape);
  const curtainKeyRef = useRef(0);
  // Capture the target orientation so the midpoint callback can commit to the
  // correct value even if isLandscape changes again before midpoint fires.
  const pendingLandscapeRef = useRef(isLandscape);

  useEffect(() => {
    if (prevIsLandscapeRef.current === isLandscape) return;
    prevIsLandscapeRef.current = isLandscape;
    pendingLandscapeRef.current = isLandscape;

    // Incrementing the key unmounts the previous OrientationCurtain (which
    // cancels its Reanimated animations via the cleanup effect inside it) and
    // mounts a fresh one for the new rotation direction.
    curtainKeyRef.current += 1;
    setCurtain({ toDirection: isLandscape ? 'landscape' : 'portrait', key: curtainKeyRef.current });
  }, [isLandscape]);

  const handleCurtainMidpoint = useCallback(() => {
    // Commit to the target layout — deterministically, not a toggle.
    // Hidden behind the opaque card background, so the seam is never visible.
    setCommittedLandscape(pendingLandscapeRef.current);
  }, []);

  const handleCurtainComplete = useCallback(() => {
    setCurtain(null);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const { 
    gameView, playerName, setPlayerName, playCard, playCards, pickupPile: doPickup, clearGame, leaveGame, 
    opponentDisconnected, opponentReconnecting, sendEmote, myEmoteBubble, opponentEmoteBubble 
  } = useGame();
  const cosmetics = useCosmetics();
  const myAvatarPortrait = useMemo(
    () => AVATARS.find((a) => a.id === cosmetics.avatarId)?.portrait ?? null,
    [cosmetics.avatarId],
  );
  // Music is started by the game-loading screen *before* navigating here, so
  // game.tsx no longer manages the music lifecycle. Even if /game remounts due
  // to a stale router.replace('/game') call, music will not restart because
  // startMusic() is a no-op when the match playlist is already active.
  const { isMuted, toggleMute } = useMusicPlayer();
  // Track the latest emote per player so each side's bubble animates
  // independently (mine + opponent's can overlap).
  const [myEmote, setMyEmote] = useState<{ emote: string; key: number } | null>(null);
  const [opponentEmote, setOpponentEmote] = useState<{ emote: string; key: number } | null>(null);

  useEffect(() => {
    if (myEmoteBubble) setMyEmote(myEmoteBubble);
  }, [myEmoteBubble]);
  useEffect(() => {
    if (opponentEmoteBubble) setOpponentEmote(opponentEmoteBubble);
  }, [opponentEmoteBubble]);
  const [lastEventType, setLastEventType] = useState<string | undefined>();
  // The currently-animating face-down reveal (null when no reveal is in flight).
  // We track it in local state so the overlay mounts/unmounts cleanly even if
  // the underlying gameView updates again before the animation finishes.
  const [reveal, setReveal] = useState<{ card: CardType; topCard: CardType | null; busted: boolean; who: string; key: string } | null>(null);
  const lastRevealKeyRef = React.useRef<string | null>(null);
  // The currently-animating multi-card burst (DOUBLE/TRIPLE/QUAD). Same
  // mount/unmount + dedupe pattern as the face-down reveal above.
  const [burst, setBurst] = useState<{ card: CardType; count: number; who: string; key: string } | null>(null);
  const lastBurstKeyRef = React.useRef<string | null>(null);
  const fireScale = useSharedValue(0.3);
  const fireOpacity = useSharedValue(0);
  const ring1Scale = useSharedValue(0.3);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.3);
  const ring2Opacity = useSharedValue(0);
  const ring3Scale = useSharedValue(0.3);
  const ring3Opacity = useSharedValue(0);
  // Tap-your-own-name-card popover. Holds the in-game player menu (Exit, etc).
  const [playerMenuOpen, setPlayerMenuOpen] = useState(false);
  // Inline name editor inside the player menu popover.
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName);

  // Layout rects for CinematicPlay (portrait)
  const [pileRectP, setPileRectP] = useState<LayoutRect | null>(null);
  const [selfHandRectP, setSelfHandRectP] = useState<LayoutRect | null>(null);
  const [opponentZoneRectP, setOpponentZoneRectP] = useState<LayoutRect | null>(null);
  const pileViewRef = useRef<View>(null);
  const selfHandRef = useRef<View>(null);
  const opponentZoneRef = useRef<View>(null);


  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  useEffect(() => {
    // When landscape is active, <GameLandscape /> owns these side effects.
    // Skipping here prevents double haptics, double victory navigation, and
    // duplicate reveal animations across the two components.
    // Guard on committedLandscape (what's actually rendered) so that during a
    // rotation transition the correct component owns the effect.
    if (committedLandscape) return;
    if (!gameView) {
      router.replace('/');
    }
  }, [gameView, committedLandscape]);

  // Hold on the final board state long enough for the player to see the winning
  // card actually land + the opponent's empty hand state, before transitioning.
  useEffect(() => {
    if (committedLandscape) return;
    if (gameView?.phase === 'finished') {
      const t = setTimeout(() => {
        router.replace({
          pathname: '/victory',
          params: { winner: gameView.winner, myId: gameView.myPlayerId, opponentName: gameView.opponentName },
        });
      }, 2700);
      return () => clearTimeout(t);
    }
  }, [gameView?.phase, committedLandscape]);

  useEffect(() => {
    if (committedLandscape) return;
    if (gameView?.lastEvent) {
      setLastEventType(gameView.lastEvent.type);

      // Trigger the flip-reveal overlay whenever a face-down blind card was
      // played, win OR bust. Dedupe via a key so a single play only animates
      // once, even if game_update fires repeatedly with the same lastEvent.
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

      // Trigger the multi-play burst overlay (DOUBLE!/TRIPLE!/QUADRUPLE!)
      // whenever 2+ same-value cards were played in one move. Skip face-down
      // plays — those get their own dedicated reveal animation instead.
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

      if (gameView.lastEvent.type === 'burn' || gameView.lastEvent.type === 'set_complete') {
        // 3× Heavy haptic at 0, 200, 700 ms — iOS only (Android ignores impact style)
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 700);
        }
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
      } else if (gameView.lastEvent.type === 'pickup') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }
  }, [gameView?.lastEvent, committedLandscape]);

  const fireStyle = useAnimatedStyle(() => ({ transform: [{ scale: fireScale.value }], opacity: fireOpacity.value }));
  const ring1Style = useAnimatedStyle(() => ({ transform: [{ scale: ring1Scale.value }], opacity: ring1Opacity.value }));
  const ring2Style = useAnimatedStyle(() => ({ transform: [{ scale: ring2Scale.value }], opacity: ring2Opacity.value }));
  const ring3Style = useAnimatedStyle(() => ({ transform: [{ scale: ring3Scale.value }], opacity: ring3Opacity.value }));

  const opponentCoins = useMemo(() => fakeCoins(gameView?.opponentName ?? ''), [gameView?.opponentName]);

  if (!gameView) return null;

  // Setup phase: render the dedicated castle-build screen instead of the
  // play board. The screen handles its own layout, status, and confirm flow.
  if (gameView.phase === 'setup') {
    return <SetupScreen />;
  }

  // All portrait-specific derived values. gameView is non-null here (guarded above).
  const {
    myHand, myFaceUp, myFaceDownCount, myFaceDownIds, opponentHandCount, opponentFaceUp, opponentFaceDownCount,
    opponentName, discardPile, deckCount, isMyTurn, canFastPlay,
  } = gameView;

  // For BURN/RESET buttons we collect ALL cards of that value from the active zone (hand if non-empty, else face-up)
  // so a single tap fires the multi-play (e.g. all four 10s burns through any pile).
  const activeZone = myHand.length > 0 ? myHand : myFaceUp;
  const burnIds = activeZone.filter((c) => c.value === 10 && canPlayCard(c, discardPile)).map((c) => c.id);
  const resetIds = activeZone.filter((c) => c.value === 2 && canPlayCard(c, discardPile)).map((c) => c.id);
  const hasBurn = burnIds.length > 0;
  const hasReset = resetIds.length > 0;

  const handlePlayBurn = () => {
    if (burnIds.length > 0) playCards(burnIds);
  };

  const handlePlayReset = () => {
    if (resetIds.length > 0) playCards(resetIds);
  };

  const handleFastPlay = () => {
    if (!canFastPlay) return;
    const top = discardPile[discardPile.length - 1];
    if (!top) return;
    const sameIds = activeZone.filter((c) => c.value === top.value).map((c) => c.id);
    if (sameIds.length > 0) playCards(sameIds);
  };

  // ── Unified single-root return ───────────────────────────────────────────
  // Both landscape and portrait branches live inside the same root View so
  // the OrientationCurtain is always at tree position [1] regardless of which
  // layout is active. This prevents it from unmounting when committedLandscape
  // flips at the curtain midpoint.
  return (
    <View style={styles.container}>
      {/* Active game layout — switches at curtain midpoint behind opaque card */}
      {committedLandscape ? (
        <GameLandscape />
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
          <SceneBackground />
          <View style={[styles.gameLayout, { paddingTop: insets.top + webTopPad + 6, paddingBottom: insets.bottom || 12 }]}>

            <View style={styles.topNavRow}>
              <BackButton label="← EXIT" onPress={() => confirmLeave(() => { leaveGame(); router.replace('/'); })} />
            </View>

            <View
              ref={opponentZoneRef}
              onLayout={() => {
                opponentZoneRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
                  const r = { x: pageX, y: pageY, width: w, height: h };
                  setOpponentZoneRectP((prev) => (layoutRectsCloseEnough(prev, r) ? prev : r));
                });
              }}
            >
              <OpponentCardArea handCount={opponentHandCount} faceUp={opponentFaceUp} faceDownCount={opponentFaceDownCount} />
            </View>

            <View style={styles.tableCenter}>
              <View style={styles.pileRow}>
                <View style={{ flex: 1 }} />
                <View
                  ref={pileViewRef}
                  onLayout={() => {
                    pileViewRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
                      const r = { x: pageX, y: pageY, width: w, height: h };
                      setPileRectP((prev) => (layoutRectsCloseEnough(prev, r) ? prev : r));
                    });
                  }}
                >
                  <GlowPile pile={discardPile} lastEventType={lastEventType} />
                </View>
                <View style={styles.deckSlot}>
                  <DeckBadge count={deckCount} />
                </View>
              </View>

              {/* Action buttons are hidden during STARTER mode — the player must
                  tap a hand card directly; pickup/burn/reset don't apply. */}
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

            <View
              ref={selfHandRef}
              style={[styles.playerSection, { width: '88%', alignSelf: 'flex-end', marginRight: '2%' }]}
              onLayout={() => {
                selfHandRef.current?.measure((_x, _y, w, h, pageX, pageY) => {
                  const r = { x: pageX, y: pageY, width: w, height: h };
                  setSelfHandRectP((prev) => (layoutRectsCloseEnough(prev, r) ? prev : r));
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
              />
            </View>

            <EmotePicker onSend={sendEmote} />
          </View>

          {/* ── Floating HUD chips ──────────────────────────────────────────
              Both chips are position:'absolute' so they never push game content
              in the flex column. Opponent anchors top-right; player bottom-left. */}

          {/* Opponent avatar chip — top-right corner, below the EXIT button row */}
          <View style={[styles.hudChip, { top: insets.top + webTopPad + 8, right: 10 }]}>
            <AvatarChip
              name={opponentName}
              isActive={!isMyTurn}
              portraitArt={null}
            />
          </View>

          {/* Player avatar chip — bottom-left corner, above the hand + emote area */}
          <View style={[styles.hudChip, { bottom: (insets.bottom || 12) + 64, left: 10 }]}>
            <AvatarChip
              name={playerName}
              isActive={isMyTurn}
              portraitArt={myAvatarPortrait}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPlayerMenuOpen((o) => !o);
              }}
            />
          </View>

          {/* Cinematic card-flight overlay — spotlight + Bezier arc + 3D tilt + impact sparks.
              initialLastKey is computed inline at render time so that each portrait branch
              remount (after rotating back from landscape) gets the current lastEvent key
              and does not replay an event that already played in landscape. */}
          {gameView && (
            <CinematicPlay
              gameId={gameView.gameId}
              lastEvent={gameView.lastEvent}
              myPlayerId={gameView.myPlayerId}
              pileRect={pileRectP}
              selfHandRect={selfHandRectP}
              opponentZoneRect={opponentZoneRectP}
              onAvatarPulse={() => {}}
              initialLastKey={gameView.lastEvent ? lastEventIdentityKey(gameView.gameId, gameView.lastEvent) : null}
            />
          )}

          {/* Player menu popover — opens when you tap your own name card.
              Opens above the bottom-left player chip. Tap the backdrop to dismiss. */}
          {playerMenuOpen && (
            <>
              <Pressable
                onPress={() => setPlayerMenuOpen(false)}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.playerMenu, { bottom: (insets.bottom || 12) + 64 + 78, left: 16 }]}>
                {editingName ? (
                  <View style={styles.nameEditRow}>
                    <TextInput
                      value={nameDraft}
                      onChangeText={setNameDraft}
                      style={[styles.nameEditInput, { color: colors.foreground, borderColor: colors.primary }]}
                      autoFocus
                      maxLength={16}
                      placeholder="Your name"
                      placeholderTextColor={colors.mutedForeground}
                      returnKeyType="done"
                      onSubmitEditing={() => {
                        const trimmed = nameDraft.trim();
                        if (trimmed) setPlayerName(trimmed);
                        setEditingName(false);
                        setPlayerMenuOpen(false);
                      }}
                    />
                    <Pressable
                      onPress={() => {
                        const trimmed = nameDraft.trim();
                        if (trimmed) setPlayerName(trimmed);
                        setEditingName(false);
                        setPlayerMenuOpen(false);
                      }}
                      style={[styles.nameEditConfirm, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.nameEditConfirmText}>✓</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => { setNameDraft(playerName); setEditingName(true); }}
                    style={styles.playerMenuItem}
                  >
                    <Text style={styles.playerMenuIcon}>✎</Text>
                    <Text style={[styles.playerMenuLabel, { color: '#e0c8ff' }]}>CHANGE NAME</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleMute();
                  }}
                  style={styles.playerMenuItem}
                >
                  <Text style={styles.playerMenuIcon}>{isMuted ? '🔇' : '🔊'}</Text>
                  <Text style={[styles.playerMenuLabel, { color: isMuted ? colors.mutedForeground : '#e0c8ff' }]}>
                    {isMuted ? 'SOUND OFF' : 'SOUND ON'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setPlayerMenuOpen(false);
                    setEditingName(false);
                    confirmLeave(() => { leaveGame(); router.replace('/'); });
                  }}
                  style={styles.playerMenuItem}
                >
                  <Text style={styles.playerMenuIcon}>🚪</Text>
                  <Text style={styles.playerMenuLabel}>EXIT GAME</Text>
                </Pressable>
              </View>
            </>
          )}

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
            <EmoteBubble key={`me_${myEmote.key}`} emote={myEmote.emote} side="left" />
          ) : null}
          {opponentEmote ? (
            <EmoteBubble key={`op_${opponentEmote.key}`} emote={opponentEmote.emote} side="right" />
          ) : null}
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
      )}

      {/* Curtain always at tree position [1] — never remounts when the layout
          branch switches at midpoint. Key changes only when a NEW rotation
          starts, which unmounts the old curtain (cancelling animations) and
          mounts a fresh one for the new direction. */}
      {curtain && (
        <OrientationCurtain
          key={curtain.key}
          toDirection={curtain.toDirection}
          onMidpoint={handleCurtainMidpoint}
          onComplete={handleCurtainComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gameLayout: { flex: 1 },
  topNavRow: { paddingHorizontal: 14, paddingBottom: 2 },
  hudChip: {
    position: 'absolute',
    zIndex: 20,
    elevation: 20,
    width: 215,
  },
  infoCard: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#2a0d4af2',
    borderRadius: 14,
    borderWidth: 1.5,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '900',
  },
  infoTextWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  infoName: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  infoLevel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statIcon: {
    fontSize: 10,
  },
  statText: {
    fontSize: 11,
    fontWeight: '800',
  },

  opponentCardArea: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    marginHorizontal: 12,
    marginTop: 6,
    gap: 4,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#3a1a5e',
    backgroundColor: '#1a053560',
  },
  opponentHandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 2,
    minHeight: 56,
  },
  faceDownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faceUpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -6,
  },
  opponentCardTag: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#10002850',
  },
  opponentCardTagText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  tableCenter: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'relative',
    paddingTop: 18,
    gap: 14,
  },
  pileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
  },
  deckSlot: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 6,
  },

  deckBadgeWrap: {
    alignItems: 'center',
    gap: 6,
  },
  deckStack: {
    width: 60,
    height: 84,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckCard: {
    position: 'absolute',
    width: 60,
    height: 84,
    borderRadius: 6,
    borderWidth: 1.2,
  },
  deckLogo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckLogoText: {
    fontSize: 18,
    fontWeight: '900',
  },
  deckLogoSub: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
    lineHeight: 9,
  },
  deckTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: '#10002850',
    alignItems: 'center',
  },
  deckTagTitle: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  deckTagCount: {
    fontSize: 13,
    fontWeight: '900',
  },

  playerSection: {
    paddingHorizontal: 4,
    paddingBottom: 10,
  },

  chatRow: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    gap: 8,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nameEditInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: '#10002870',
  },
  nameEditConfirm: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameEditConfirmText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  chatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    backgroundColor: '#10002890',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatIcon: {
    fontSize: 16,
  },
  menuDotsBadge: {
    position: 'absolute',
    top: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3a1a5e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDotsText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#e0c8ff',
    lineHeight: 14,
    marginTop: -4,
  },
  playerMenu: {
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
  playerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  playerMenuIcon: { fontSize: 16 },
  playerMenuLabel: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#ff4d6d',
  },

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
    bottom: 80,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disconnectLeave: {
    fontSize: 14,
    fontWeight: '700',
  },
});
