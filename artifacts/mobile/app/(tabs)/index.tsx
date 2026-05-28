import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  runOnJS,
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
import { AVATARS, useCosmetics } from '@/contexts/CosmeticsContext';
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
  const { playerName, setPlayerName, isInQueue, connectionStatus, gameView, onlineCount } = useGame();
  const { isAuthenticated, profile } = useGameCenter();
  const { playSplashTrack, isMuted, toggleMute, volumeLevel, setVolumeLevel } = useMusicPlayer();
  const cosmetics = useCosmetics();
  const avatarPortrait = useMemo(
    () => AVATARS.find((a) => a.id === cosmetics.avatarId)?.portrait ?? null,
    [cosmetics.avatarId],
  );
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(playerName);
  const [showPicker, setShowPicker] = useState(false);
  const lastNavigatedGameIdRef = useRef<string | null>(null);

  const pillOpacity = useSharedValue(0);
  const pillTranslateX = useSharedValue(-20);

  const openPicker = useCallback(() => {
    setShowPicker(true);
    pillOpacity.value = withTiming(1, { duration: 180 });
    pillTranslateX.value = withTiming(0, { duration: 200 });
  }, [pillOpacity, pillTranslateX]);

  const closePicker = useCallback(() => {
    pillOpacity.value = withTiming(0, { duration: 150 });
    pillTranslateX.value = withTiming(-20, { duration: 160 }, () => {
      'worklet';
      runOnJS(setShowPicker)(false);
    });
  }, [pillOpacity, pillTranslateX]);

  const pillsAnimStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateX: pillTranslateX.value }],
  }));

  // Start splash music on focus. The MusicContext guards re-entry, so this is a
  // no-op if splash is already playing — letting the lobby track carry through
  // mode-select → arena-picker → matchmaking without restarting on each focus.
  // We do NOT stop music on blur so it plays continuously across all pre-game
  // screens; the game-loading screen explicitly stops it before the match.
  useFocusEffect(
    useCallback(() => {
      playSplashTrack();
    }, [playSplashTrack]),
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
      router.replace('/game-loading');
    }
  }, [gameView]);

  useEffect(() => {
    if (isInQueue) {
      router.push('/matchmaking');
    }
  }, [isInQueue]);

  const handlePlay = () => {
    if (connectionStatus !== 'connected') return;
    router.push('/mode-select');
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#200040', '#0a0018', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <SplashCards />

      <View style={[styles.inner, { paddingTop: insets.top + webTopPad + 20, paddingBottom: insets.bottom + 74 }]}>

        <View style={styles.topGroup}>
          <Animated.View style={[styles.logoSection, logoStyle]}>
            <Text style={styles.logoCrown}>♛</Text>
            <Text style={styles.logoThe}>THE</Text>
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

        </View>

        <View style={styles.bottomGroup}>
          <View style={styles.nameSection}>
            {avatarPortrait && (
              <View style={styles.lobbyAvatar}>
                <Image
                  source={avatarPortrait}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  contentPosition="top"
                />
              </View>
            )}
            <View style={styles.glassTagGlow}>
            <BlurView intensity={55} tint="dark" style={styles.glassTag}>
              <View style={styles.glassTagInner}>
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
                    <Text style={[styles.playerName, { color: '#ffffff' }]}>
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
            </BlurView>
            </View>
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
                    {connectionStatus === 'connected' ? 'TAP TO PLAY' : 'CONNECTING...'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <View style={[styles.goldPillOuter, styles.goldPillSmall, styles.morphPillOuter]}>
              <Pressable
                onPress={() => router.push('/how-to-play')}
                style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.88 }]}
              >
                <LinearGradient
                  colors={['#e8d060', '#b89018', '#e8d060']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.morphGradient}
                >
                  <View style={styles.pillRow}>
                    <Text style={styles.pillIcon}>?</Text>
                    <Text style={[styles.goldPillText, styles.goldPillTextSm]}>HOW TO PLAY</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>

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
              {connectionStatus === 'connected'
                ? onlineCount > 0
                  ? `● ${onlineCount} online`
                  : 'ONLINE'
                : connectionStatus.toUpperCase()}
            </Text>
          </View>

          <View style={styles.musicRow}>
            <Pressable
              onPress={() => {
                if (isMuted) {
                  toggleMute();
                } else if (showPicker) {
                  closePicker();
                } else {
                  openPicker();
                }
              }}
              onLongPress={() => {
                if (!isMuted) {
                  if (showPicker) closePicker();
                  toggleMute();
                }
              }}
              delayLongPress={400}
              style={({ pressed }) => [styles.muteBtn, pressed && { opacity: 0.6 }]}
              hitSlop={8}
            >
              <Text style={styles.muteIcon}>{isMuted ? '🔇' : '🔊'}</Text>
            </Pressable>
            {showPicker && (
              <Animated.View style={[styles.musicPills, pillsAnimStyle]}>
                {([0, 0.25, 0.5, 1.0] as const).map((v) => {
                  const active = v === 0 ? isMuted : (!isMuted && volumeLevel === v);
                  return (
                    <Pressable
                      key={v}
                      onPress={() => {
                        if (v === 0) {
                          if (!isMuted) toggleMute();
                          closePicker();
                        } else {
                          setVolumeLevel(v);
                          if (isMuted) toggleMute();
                          closePicker();
                        }
                      }}
                      style={({ pressed }) => [
                        styles.musicPill,
                        active && styles.musicPillActive,
                        pressed && { opacity: 0.6 },
                      ]}
                      hitSlop={6}
                    >
                      <Text style={[styles.musicPillText, active && styles.musicPillTextActive]}>
                        {v === 0 ? '0%' : v === 0.25 ? '25%' : v === 0.5 ? '50%' : '100%'}
                      </Text>
                    </Pressable>
                  );
                })}
              </Animated.View>
            )}
          </View>
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
    paddingHorizontal: 24,
  },
  topGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 56,
  },
  bottomGroup: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 14,
    width: '100%',
  },
  logoSection: { alignItems: 'center', marginTop: 20 },
  logoCrown: { fontSize: 28, color: '#ffd700', marginBottom: 2, textShadowColor: '#c8960a', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  logoThe: { fontSize: 22, fontWeight: '600', letterSpacing: 6, color: '#ffd700', textShadowColor: '#c8960a', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10, marginBottom: 2 },
  logoTitle: { fontSize: 64, fontWeight: '900', letterSpacing: 8, lineHeight: 68 },
  logoRoyale: { fontSize: 52, fontWeight: '900', letterSpacing: 6, fontStyle: 'italic', lineHeight: 58 },
  logoTagline: { marginTop: 8, fontSize: 11, letterSpacing: 3, fontWeight: '500' },
  nameSection: { marginTop: -22, alignItems: 'center', gap: 0 },
  lobbyAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(212,168,32,0.85)',
    backgroundColor: '#1a0535',
    marginBottom: -10,
    zIndex: 1,
    shadowColor: '#d4a820',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 10,
  },
  glassTagGlow: {
    borderRadius: 20,
    shadowColor: '#9b6dff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 10,
  },
  glassTag: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(180,140,255,0.45)',
  },
  glassTagInner: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { height: 40, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, fontSize: 16, minWidth: 140 },
  nameConfirm: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  nameConfirmText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  playerName: { fontSize: 17, fontWeight: '900', letterSpacing: 1.5 },
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
  goldPillSmall: { shadowOpacity: 0.35, shadowRadius: 10, elevation: 8, height: 50 },
  goldPill: { height: 60, justifyContent: 'center', alignItems: 'center', borderRadius: 32 },
  morphPillOuter: { overflow: 'hidden' },
  morphGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  goldPillText: { color: '#1a0e00', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  goldPillTextSm: { fontSize: 17, letterSpacing: 3 },
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
  musicRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  musicPills: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  muteBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  muteIcon: { fontSize: 18 },
  musicPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  musicPillActive: {
    borderColor: '#d4a820',
    backgroundColor: 'rgba(212,168,32,0.15)',
  },
  musicPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.35)' },
  musicPillTextActive: { color: '#ffd700' },
});
