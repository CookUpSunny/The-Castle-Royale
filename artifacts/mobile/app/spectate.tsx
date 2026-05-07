import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import CardComponent, { CardBack } from '@/components/Card';
import GlowPile from '@/components/GlowPile';
import SceneBackground from '@/components/SceneBackground';

export default function SpectateScreen() {
  const insets = useSafeAreaInsets();
  const { spectatorView, leaveSpectate } = useGame();

  // ── Orbit camera ──────────────────────────────────────────────────────────
  // Slow cinematic Y-axis sway ±12° — drone-over-coliseum effect.
  const tiltAngle = useSharedValue(0);
  useEffect(() => {
    tiltAngle.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-12, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [tiltAngle]);

  // ── Fire burst + ripple overlays for burn/set_complete events ──────────────
  const fireScale = useSharedValue(0.3);
  const fireOpacity = useSharedValue(0);
  const ring1Scale = useSharedValue(0.3);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.3);
  const ring2Opacity = useSharedValue(0);
  const ring3Scale = useSharedValue(0.3);
  const ring3Opacity = useSharedValue(0);

  // Deduplicate fire events using a string key so the same burn doesn't fire twice.
  const lastBurnKeyRef = useRef('');
  const { lastEvent } = spectatorView ?? {};
  const burnKey = lastEvent && (lastEvent.type === 'burn' || lastEvent.type === 'set_complete')
    ? `${lastEvent.type}_${lastEvent.playerId}_${lastEvent.card?.id ?? 'x'}`
    : '';

  useEffect(() => {
    if (!burnKey || burnKey === lastBurnKeyRef.current) return;
    lastBurnKeyRef.current = burnKey;

    // Fire burst (radial scale from center — no translateX/Y)
    fireScale.value = 0.3;
    fireOpacity.value = 0.9;
    fireScale.value = withTiming(2.5, { duration: 850 });
    fireOpacity.value = withTiming(0, { duration: 850 });

    // 3 ripple rings staggered by 120 ms each
    ring1Scale.value = 0.3;
    ring1Opacity.value = 0.8;
    ring1Scale.value = withTiming(2.0, { duration: 700 });
    ring1Opacity.value = withTiming(0, { duration: 700 });
    setTimeout(() => {
      ring2Scale.value = 0.3;
      ring2Opacity.value = 0.7;
      ring2Scale.value = withTiming(2.0, { duration: 700 });
      ring2Opacity.value = withTiming(0, { duration: 700 });
    }, 120);
    setTimeout(() => {
      ring3Scale.value = 0.3;
      ring3Opacity.value = 0.6;
      ring3Scale.value = withTiming(2.0, { duration: 700 });
      ring3Opacity.value = withTiming(0, { duration: 700 });
    }, 240);

    // 3× Heavy haptic at 0, 200, 700 ms — no camera shake
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 700);
  }, [burnKey, fireScale, fireOpacity, ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, ring3Scale, ring3Opacity]);

  // ── Navigate away when game ends ──────────────────────────────────────────
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (spectatorView) { hasMountedRef.current = true; }
  }, [spectatorView]);

  useEffect(() => {
    // spectator_game_over cleared spectatorView — go back to lobby
    if (spectatorView !== null || !hasMountedRef.current) return;
    const t = setTimeout(() => { leaveSpectate(); router.replace('/'); }, 1800);
    return () => clearTimeout(t);
  }, [spectatorView, leaveSpectate]);

  useEffect(() => {
    if (spectatorView?.phase !== 'finished') return;
    const t = setTimeout(() => { leaveSpectate(); router.replace('/'); }, 2000);
    return () => clearTimeout(t);
  }, [spectatorView?.phase, leaveSpectate]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const orbitStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ perspective: 900 }, { rotateY: `${tiltAngle.value}deg` }],
  }));
  const fireStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fireScale.value }],
    opacity: fireOpacity.value,
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));

  const doExit = () => { leaveSpectate(); router.replace('/'); };

  // Helper: render a fan of face-down card backs
  const handFan = (count: number) =>
    Array.from({ length: Math.min(count, 7) }).map((_, i) => (
      <View
        key={i}
        style={{
          marginLeft: i === 0 ? 0 : -20,
          transform: [{ rotate: `${(i - (Math.min(count, 7) - 1) / 2) * 5}deg` }],
        }}
      >
        <CardBack size="sm" />
      </View>
    ));

  if (!spectatorView) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <SceneBackground />
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyIcon}>👁</Text>
          <Text style={styles.emptyTitle}>MATCH ENDED</Text>
          <Pressable style={styles.exitBtn} onPress={doExit}>
            <Text style={styles.exitBtnText}>← LOBBY</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const {
    player1Name, player1HandCount, player1FaceUp, player1FaceDownCount,
    player2Name, player2HandCount, player2FaceUp, player2FaceDownCount,
    discardPile, deckCount, currentPlayerName, spectatorCount,
  } = spectatorView;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <SceneBackground />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.watchBadge}>
          <Text style={styles.watchText}>👁 SPECTATING</Text>
          {spectatorCount > 0 && (
            <Text style={styles.watchCount}> · {spectatorCount} watching</Text>
          )}
        </View>
        <Pressable style={styles.exitBtn} onPress={doExit}>
          <Text style={styles.exitBtnText}>✕ EXIT</Text>
        </Pressable>
      </View>

      {/* ── Arena with orbit camera ── */}
      <Animated.View style={orbitStyle}>
        {/* Player 2 (top) */}
        <View style={styles.playerZone}>
          <View style={styles.playerNameRow}>
            <Text style={styles.playerName} numberOfLines={1}>{player2Name}</Text>
            {currentPlayerName === player2Name && (
              <View style={styles.turnBadge}><Text style={styles.turnText}>▶ PLAYING</Text></View>
            )}
          </View>
          <View style={styles.handFanRow}>{handFan(player2HandCount)}</View>
          <View style={styles.boardRow}>
            {Array.from({ length: Math.min(player2FaceDownCount, 3) }).map((_, i) => (
              <CardBack key={i} size="sm" style={{ marginLeft: i === 0 ? 0 : -18 }} />
            ))}
            {player2FaceUp.slice(0, 5).map((card, i) => (
              <CardComponent key={card.id} card={card} size="sm" style={{ marginLeft: i === 0 ? 8 : -14 }} />
            ))}
          </View>
          <Text style={styles.handCountText}>{player2HandCount} in hand</Text>
        </View>

        {/* Center — pile + deck */}
        <View style={styles.centerZone}>
          <GlowPile pile={discardPile} lastEventType={spectatorView.lastEvent?.type} />
          <View style={styles.deckPill}>
            <Text style={styles.deckPillText}>DECK  {deckCount}</Text>
          </View>
        </View>

        {/* Player 1 (bottom) */}
        <View style={styles.playerZone}>
          <Text style={styles.handCountText}>{player1HandCount} in hand</Text>
          <View style={styles.boardRow}>
            {player1FaceUp.slice(0, 5).map((card, i) => (
              <CardComponent key={card.id} card={card} size="sm" style={{ marginLeft: i === 0 ? 0 : -14 }} />
            ))}
            {Array.from({ length: Math.min(player1FaceDownCount, 3) }).map((_, i) => (
              <CardBack key={i} size="sm" style={{ marginLeft: i === 0 ? 8 : -18 }} />
            ))}
          </View>
          <View style={styles.handFanRow}>{handFan(player1HandCount)}</View>
          <View style={styles.playerNameRow}>
            {currentPlayerName === player1Name && (
              <View style={styles.turnBadge}><Text style={styles.turnText}>▶ PLAYING</Text></View>
            )}
            <Text style={styles.playerName} numberOfLines={1}>{player1Name}</Text>
          </View>
        </View>
      </Animated.View>

      {/* ── Fire burst overlay — radial scale, NO translateX/Y ── */}
      <Animated.View style={[styles.burstOverlay, fireStyle]} pointerEvents="none">
        <LinearGradient
          colors={['#ff7f0000', '#ff7f00cc', '#ff000099']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.burstOverlay, ring1Style]} pointerEvents="none">
        <LinearGradient colors={['transparent', '#ff6b00a0', 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.burstOverlay, ring2Style]} pointerEvents="none">
        <LinearGradient colors={['transparent', '#ff4d0070', 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={[styles.burstOverlay, ring3Style]} pointerEvents="none">
        <LinearGradient colors={['transparent', '#ff000050', 'transparent']} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07000f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  watchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1a053590',
    borderWidth: 1,
    borderColor: '#5b1a8c',
  },
  watchText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#e0c8ff',
    letterSpacing: 1.5,
  },
  watchCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a855f7',
  },
  exitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#3a1a5e80',
    borderWidth: 1,
    borderColor: '#5b1a8c',
  },
  exitBtnText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#e0c8ff',
    letterSpacing: 1,
  },
  playerZone: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  playerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#e0c8ff',
    letterSpacing: 1,
    maxWidth: 200,
  },
  turnBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#ffd70020',
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  turnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 1.5,
  },
  handFanRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 52,
  },
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  handCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  centerZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deckPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#1a053590',
    borderWidth: 1,
    borderColor: '#3a1a5e',
  },
  deckPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffd700',
    letterSpacing: 2,
  },
  burstOverlay: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    right: '20%',
    bottom: '30%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#e0c8ff',
    letterSpacing: 4,
  },
});
