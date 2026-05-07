import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useGameCenter } from '@/contexts/GameCenterContext';
import { useColors } from '@/hooks/useColors';
import { useMusicPlayer } from '@/contexts/MusicContext';
import SplashCards from '@/components/SplashCards';

// ─── Outlined title text ──────────────────────────────────────────────────────
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
      <Text style={[textStyle, { color: mainColor, textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

export default function LobbyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { playerName, setPlayerName, isInQueue, connectionStatus, gameView } = useGame();
  const { isGameCenterAvailable, isAuthenticated, isLoading, profile, signIn } = useGameCenter();
  const { playSplashTrack, stopMusic } = useMusicPlayer();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);
  const lastNavigatedGameIdRef = useRef<string | null>(null);

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
    if (gameView && gameView.gameId !== lastNavigatedGameIdRef.current) {
      lastNavigatedGameIdRef.current = gameView.gameId;
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
    router.push('/arena-picker?mode=pvp');
  };

  const handleBotPlay = () => {
    if (connectionStatus !== 'connected') return;
    router.push('/arena-picker?mode=bot');
  };

  const handleNameSave = () => {
    if (nameInput.trim()) {
      setPlayerName(nameInput.trim());
    }
    setEditingName(false);
  };

  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  const displayCoins = profile?.coins ?? null;
  const displayElo = profile?.elo ?? null;
  // Show GC sign-in button only when the native module is truly available (native iOS EAS build).
  // Show the anonymous-mode banner on Android, web, AND Expo Go on iOS.
  const showGameCenterButton = isGameCenterAvailable && !isAuthenticated && !isLoading;
  const showGameCenterBanner = !isGameCenterAvailable;

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
                ✎  {profile?.displayName ?? playerName}
              </Text>
            </Pressable>
          )}
          {isAuthenticated && displayElo !== null && (
            <Text style={[styles.eloText, { color: colors.accent }]}>
              ELO {displayElo}
            </Text>
          )}
        </View>

        <View style={styles.menuSection}>
          {showGameCenterButton && (
            <Pressable
              onPress={() => { signIn(); }}
              style={({ pressed }) => [styles.gcButton, pressed && { opacity: 0.78 }]}
            >
              <Text style={styles.gcButtonText}>Sign in with Game Center</Text>
            </Pressable>
          )}

          {showGameCenterBanner && (
            <View style={styles.gcBanner}>
              <Text style={[styles.gcBannerText, { color: colors.mutedForeground }]}>
                Game Center leaderboards are iOS-only. Playing anonymously.
              </Text>
            </View>
          )}

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

        </View>

        <View style={styles.statsRow}>
          {displayCoins !== null ? (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {displayCoins.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>COINS</Text>
            </View>
          ) : (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#444' }]}>—</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>COINS</Text>
            </View>
          )}
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          {isAuthenticated && profile ? (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.electric }]}>
                {profile.wins}W · {profile.losses}L
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>RECORD</Text>
            </View>
          ) : (
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#444' }]}>—</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>RECORD</Text>
            </View>
          )}
        </View>


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
  nameSection: { marginTop: 8, alignItems: 'center' },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { height: 40, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, fontSize: 16, minWidth: 140 },
  nameConfirm: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  nameConfirmText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  playerName: { fontSize: 14, fontWeight: '600', letterSpacing: 1 },
  eloText: { fontSize: 11, fontWeight: '700', letterSpacing: 2, marginTop: 3 },
  menuSection: { width: '100%', gap: 10 },
  gcButton: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  gcButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  gcBanner: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  gcBannerText: { fontSize: 11, textAlign: 'center', letterSpacing: 0.3 },
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
});
