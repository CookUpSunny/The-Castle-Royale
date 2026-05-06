import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import { useMusicPlayer } from '@/contexts/MusicContext';
import CosmeticsModal from '@/components/CosmeticsModal';
import SplashCards from '@/components/SplashCards';

// ─── Outlined title text ──────────────────────────────────────────────────────
// Renders text with a black stroke border and a colored glow emanating from it.
const STROKE_OFFSETS: [number, number][] = [
  [-2, -2], [0, -2], [2, -2],
  [-2,  0],          [2,  0],
  [-2,  2], [0,  2], [2,  2],
];

function OutlinedTitle({
  text,
  textStyle,
  mainColor,
  glowColor,
}: {
  text: string;
  textStyle: TextStyle;
  mainColor: string;
  glowColor: string;
}) {
  return (
    <View>
      {/* Colored glow radiating from the black border area */}
      <Text
        style={[
          textStyle,
          {
            position: 'absolute',
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#000000',
            textShadowColor: glowColor,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 32,
          },
        ]}
      >
        {text}
      </Text>
      {/* Black stroke — 8-direction offset copies */}
      {STROKE_OFFSETS.map(([dx, dy], i) => (
        <Text
          key={i}
          style={[
            textStyle,
            {
              position: 'absolute',
              left: dx,
              right: -dx,
              top: dy,
              textAlign: 'center',
              color: '#000000',
            },
          ]}
        >
          {text}
        </Text>
      ))}
      {/* Main colored text — sizes the parent View */}
      <Text style={[textStyle, { color: mainColor, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

export default function LobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { playerName, setPlayerName, joinQueue, quickPlayBot, isInQueue, connectionStatus, gameView } = useGame();
  const { playSplashTrack, stopMusic } = useMusicPlayer();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      playSplashTrack();
      return () => { stopMusic(); };
    }, [playSplashTrack, stopMusic]),
  );

  const playScale = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(30);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoY.value = withSpring(0, { damping: 14, stiffness: 100 });
    playScale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1000 }),
        withTiming(0.98, { duration: 1000 }),
      ),
      -1,
      true,
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));

  const playStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playScale.value }],
  }));

  useEffect(() => {
    if (gameView) {
      router.replace('/game');
    }
  }, [gameView]);

  useEffect(() => {
    if (isInQueue) {
      router.push('/matchmaking');
    }
  }, [isInQueue]);

  const handlePlay = () => {
    if (connectionStatus !== 'connected') return;
    joinQueue();
  };

  const handleBotPlay = () => {
    if (connectionStatus !== 'connected') return;
    quickPlayBot();
  };

  const handleNameSave = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
    }
    setEditingName(false);
  };

  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#200040', '#0a0018', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <SplashCards />

      <View style={[styles.inner, { paddingTop: insets.top + webTopPad + 20, paddingBottom: insets.bottom + 34 }]}>

        <Animated.View style={[styles.logoSection, logoStyle]}>
          <Text style={styles.logoCrown}>♛</Text>
          <OutlinedTitle
            text="CASTLE"
            textStyle={styles.logoTitle}
            mainColor="#ffd700"
            glowColor="#c8960a"
          />
          <OutlinedTitle
            text="ROYALE"
            textStyle={styles.logoRoyale}
            mainColor="#a855f7"
            glowColor="#a855f7"
          />
          <Text style={[styles.logoTagline, { color: colors.mutedForeground }]}>RISK IT ALL · WIN IT ALL</Text>
        </Animated.View>

        <View style={styles.nameSection}>
          {editingName ? (
            <View style={styles.nameEditRow}>
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                style={[styles.nameInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.card }]}
                autoFocus
                maxLength={16}
                onSubmitEditing={handleNameSave}
                returnKeyType="done"
              />
              <Pressable onPress={handleNameSave} style={[styles.nameConfirm, { backgroundColor: colors.primary }]}>
                <Text style={styles.nameConfirmText}>✓</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => { setNameInput(playerName); setEditingName(true); }}>
              <Text style={[styles.playerName, { color: colors.mutedForeground }]}>
                ✎  {playerName}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.menuSection}>
          <Animated.View style={playStyle}>
            <Pressable
              onPress={handlePlay}
              disabled={connectionStatus !== 'connected'}
              style={({ pressed }) => [styles.goldPillOuter, pressed && { opacity: 0.88 }]}
            >
              <LinearGradient
                colors={connectionStatus === 'connected'
                  ? ['#f5e070', '#d4a820', '#f5e070']
                  : ['#3a3020', '#1e1a0a', '#3a3020']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.goldPill}
              >
                <Text style={[styles.goldPillText, connectionStatus !== 'connected' && { color: '#5a5030' }]}>
                  {connectionStatus === 'connected' ? 'PLAY' : 'CONNECTING...'}
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Pressable
            onPress={handleBotPlay}
            disabled={connectionStatus !== 'connected'}
            style={({ pressed }) => [styles.goldPillOuter, styles.goldPillSmall, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={connectionStatus === 'connected'
                ? ['#e8d060', '#b89018', '#e8d060']
                : ['#2e2810', '#181408', '#2e2810']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.goldPill}
            >
              <View style={styles.pillRow}>
                <Text style={[styles.pillIcon, connectionStatus !== 'connected' && { color: '#5a5030' }]}>⚡</Text>
                <Text style={[styles.goldPillText, styles.goldPillTextSm, connectionStatus !== 'connected' && { color: '#5a5030' }]}>QUICK PLAY · BOT</Text>
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => { if (connectionStatus === 'connected') router.push('/private-room'); }}
            disabled={connectionStatus !== 'connected'}
            style={({ pressed }) => [styles.goldPillOuter, styles.goldPillSmall, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={connectionStatus === 'connected'
                ? ['#e8d060', '#b89018', '#e8d060']
                : ['#2e2810', '#181408', '#2e2810']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.goldPill}
            >
              <View style={styles.pillRow}>
                <Text style={[styles.pillIcon, connectionStatus !== 'connected' && { color: '#5a5030' }]}>♛</Text>
                <Text style={[styles.goldPillText, styles.goldPillTextSm, connectionStatus !== 'connected' && { color: '#5a5030' }]}>PRIVATE ROOM</Text>
              </View>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => setCosmeticsOpen(true)}
            style={({ pressed }) => [styles.goldPillOuter, styles.goldPillSmall, pressed && { opacity: 0.88 }]}
          >
            <LinearGradient
              colors={['#e8d060', '#b89018', '#e8d060']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.goldPill}
            >
              <View style={styles.pillRow}>
                <Text style={styles.pillIcon}>✦</Text>
                <Text style={[styles.goldPillText, styles.goldPillTextSm]}>COSMETICS</Text>
                <View style={styles.premiumDot} />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.accent }]}>125,000</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>COINS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.electric }]}>8,450</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>GEMS</Text>
          </View>
        </View>

        <CosmeticsModal visible={cosmeticsOpen} onClose={() => setCosmeticsOpen(false)} />

        <View style={styles.connectionDot}>
          <View style={[styles.dot, { backgroundColor: connectionStatus === 'connected' ? '#22c55e' : '#ef4444' }]} />
          <Text style={[styles.connectionText, { color: colors.mutedForeground }]}>
            {connectionStatus === 'connected' ? 'ONLINE' : connectionStatus.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  logoSection: { alignItems: 'center', marginTop: 20 },
  logoCrown: { fontSize: 28, color: '#ffd700', marginBottom: 2, textShadowColor: '#c8960a', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  logoTitle: { fontSize: 64, fontWeight: '900', letterSpacing: 8, lineHeight: 68 },
  logoRoyale: { fontSize: 52, fontWeight: '900', letterSpacing: 6, fontStyle: 'italic', lineHeight: 58 },
  logoTagline: { marginTop: 8, fontSize: 11, letterSpacing: 3, fontWeight: '500' },
  nameSection: { marginTop: 8 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { height: 40, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, fontSize: 16, minWidth: 140 },
  nameConfirm: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  nameConfirmText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  playerName: { fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  menuSection: { width: '100%', gap: 10 },
  goldPillOuter: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#d4a820',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 12,
  },
  goldPillSmall: { shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
  goldPill: { height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 32 },
  goldPillText: { color: '#1a0e00', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  goldPillTextSm: { fontSize: 13, letterSpacing: 3 },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pillIcon: { fontSize: 16, fontWeight: '900', color: '#1a0e00' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 2, marginTop: 2 },
  statDivider: { width: 1, height: 30 },
  connectionDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
  premiumDot: { width: 6, height: 6, borderRadius: 3, marginLeft: 6, backgroundColor: '#1a0e00' },
});
