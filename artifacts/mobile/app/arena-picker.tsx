import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ARENAS, AVATARS, type ArenaId, type AvatarId, useCosmetics } from '@/contexts/CosmeticsContext';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import ArenaBackground from '@/components/ArenaBackground';
import BackButton from '@/components/BackButton';

export default function ArenaPickerScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const { arena, setArena, avatarId, setAvatar } = useCosmetics();
  const { quickPlayBot, joinQueue, connectionStatus, gameView, isInQueue } = useGame();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selectedArena, setSelectedArena] = useState<ArenaId>(arena);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>(avatarId);

  const lastNavigatedGameIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (gameView && gameView.gameId !== lastNavigatedGameIdRef.current) {
      lastNavigatedGameIdRef.current = gameView.gameId;
      router.replace('/game-loading');
    }
  }, [gameView]);

  useEffect(() => {
    if (isInQueue) router.replace('/matchmaking');
  }, [isInQueue]);

  const doEnterArena = () => {
    setArena(selectedArena);
    setAvatar(selectedAvatar);
    if (mode === 'bot') {
      quickPlayBot();
      router.replace('/game-loading?mode=bot');
    } else if (mode === 'private') {
      router.replace('/private-room');
    } else {
      joinQueue();
    }
  };

  const handleConfirm = () => {
    if (connectionStatus !== 'connected') return;
    const avatarName = selectedAvatarData?.name ?? 'Your character';
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${avatarName} enters the arena. Ready?`)) {
        doEnterArena();
      }
    } else {
      Alert.alert(
        'Ready to Battle?',
        `${avatarName} will enter the arena. You can't change your loadout mid-match.`,
        [
          { text: 'Not yet', style: 'cancel' },
          { text: 'ENTER THE ARENA', onPress: doEnterArena },
        ],
      );
    }
  };

  const maxContentWidth = Math.min(width - 32, 460);
  const arenaCardWidth = Math.min(width * 0.88, 420);
  const avatarCardWidth = arenaCardWidth;
  const avatarSnapInterval = avatarCardWidth + 14;
  const avatarCarouselPad = (width - avatarCardWidth) / 2;
  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  const selectedAvatarData = AVATARS.find((a) => a.id === selectedAvatar);

  return (
    <View style={[styles.container, { backgroundColor: '#f0dfc0' }]}>

      <View style={[styles.header, { paddingTop: insets.top + webTopPad + 8 }]}>
        <BackButton label="← BACK" onPress={() => router.back()} labelStyle={styles.backLabelShadow} />
        <Text style={[styles.title, { color: colors.foreground, textShadowColor: '#000000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 }]}>YOUR LOADOUT</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, textShadowColor: '#000000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 2 }]}>
          {mode === 'bot' ? 'Quick Play · Bot' : mode === 'private' ? 'Private Room · Pick Your Look' : 'Ranked Match'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 112 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── CHARACTER SELECTION ─────────────────────────────────────── */}
        <View style={[styles.section, { width: maxContentWidth }]}>
          <Text style={[styles.sectionLabel, { color: colors.neonGold }]}>
            ✦  PICK YOUR CHARACTER
          </Text>
        </View>

        {/* Full-width snap carousel */}
        <View style={{ width }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={avatarSnapInterval}
            snapToAlignment="center"
            contentContainerStyle={{
              paddingHorizontal: avatarCarouselPad,
              gap: 14,
            }}
          >
            {AVATARS.map((av) => {
              const isSelected = selectedAvatar === av.id;
              return (
                <Pressable
                  key={av.id}
                  onPress={() => setSelectedAvatar(av.id)}
                  style={({ pressed }) => [
                    styles.avatarCard,
                    {
                      width: avatarCardWidth,
                      borderColor: isSelected ? av.color : 'rgba(255,255,255,0.10)',
                      borderWidth: isSelected ? 2.5 : 1,
                      shadowColor: av.color,
                      shadowOpacity: isSelected ? 0.85 : 0,
                      shadowRadius: 20,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: isSelected ? 14 : 0,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Image
                    source={av.portrait}
                    style={styles.avatarImage}
                    contentFit="contain"
                    contentPosition="top center"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.82)']}
                    start={{ x: 0, y: 0.45 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                  {isSelected ? (
                    <View style={[styles.selectedBadge, { position: 'absolute', top: 10, right: 10 }]}>
                      <Text style={styles.selectedBadgeText}>✓  SELECTED</Text>
                    </View>
                  ) : null}
                  <View style={styles.avatarNameWrap}>
                    <Text style={[styles.avatarName, { color: isSelected ? av.color : '#fff' }]}>
                      {av.name}
                    </Text>
                    <Text style={[styles.avatarQuote, { color: 'rgba(255,255,255,0.60)' }]} numberOfLines={1}>
                      "{av.quote}"
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Pagination dots */}
        <View style={styles.dotsRow}>
          {AVATARS.map((av) => (
            <View
              key={av.id}
              style={[
                styles.dot,
                {
                  backgroundColor: selectedAvatar === av.id ? av.color : 'rgba(255,255,255,0.22)',
                  width: selectedAvatar === av.id ? 18 : 6,
                },
              ]}
            />
          ))}
        </View>

        {/* ── ARENA SELECTION ─────────────────────────────────────────── */}
        <View style={[styles.section, { width: maxContentWidth }]}>
          <Text style={[styles.sectionLabel, { color: colors.neonGold }]}>
            ✦  PICK YOUR ARENA
          </Text>
        </View>

        {ARENAS.map((arenaItem) => {
          const isSelected = selectedArena === arenaItem.id;
          const isLocked = arenaItem.premium;

          return (
            <Pressable
              key={arenaItem.id}
              onPress={() => { if (!isLocked) setSelectedArena(arenaItem.id); }}
              style={({ pressed }) => [
                styles.arenaCard,
                {
                  width: arenaCardWidth,
                  borderColor: isSelected ? '#ffd700' : 'rgba(255,255,255,0.10)',
                  borderWidth: isSelected ? 2.5 : 1,
                  opacity: isLocked ? 0.62 : pressed ? 0.88 : 1,
                },
              ]}
            >
              <View style={StyleSheet.absoluteFill}>
                <ArenaBackground arenaOverride={arenaItem.id} />
              </View>

              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.82)']}
                start={{ x: 0, y: 0.3 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />

              <View style={styles.arenaCardInner}>
                <View style={styles.arenaBadgeRow}>
                  {isLocked ? (
                    <View style={styles.lockBadge}>
                      <Text style={styles.lockBadgeText}>🔒  PREMIUM</Text>
                    </View>
                  ) : isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓  SELECTED</Text>
                    </View>
                  ) : null}
                </View>

                <View>
                  <Text style={styles.arenaName}>{arenaItem.name}</Text>
                  <Text style={styles.arenaDesc} numberOfLines={2}>
                    {arenaItem.description.split('\n')[0]}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.confirmBar, { paddingBottom: insets.bottom + 18 }]}>
        <Pressable
          onPress={handleConfirm}
          disabled={connectionStatus !== 'connected'}
          style={({ pressed }) => [styles.confirmOuter, pressed && { opacity: 0.88 }]}
        >
          <LinearGradient
            colors={
              connectionStatus === 'connected'
                ? ['#f5e070', '#d4a820', '#f5e070']
                : ['#3a3020', '#1e1a0a', '#3a3020']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmPill}
          >
            <Text
              style={[
                styles.confirmText,
                connectionStatus !== 'connected' && { color: '#5a5030' },
              ]}
            >
              {connectionStatus === 'connected' ? 'ENTER THE ARENA' : 'CONNECTING...'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 14,
  },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  subtitle: { fontSize: 11, letterSpacing: 2, marginTop: 5, textAlign: 'center' },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 4,
    gap: 14,
  },
  section: {
    paddingHorizontal: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 10,
    marginLeft: 2,
  },
  avatarCard: {
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  avatarImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  avatarNameWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  avatarName: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: '#fff',
    marginBottom: 4,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  avatarQuote: {
    fontSize: 11,
    fontStyle: 'italic',
    letterSpacing: 0.2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  arenaCard: {
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  arenaCardInner: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  arenaBadgeRow: {
    alignItems: 'flex-end',
  },
  lockBadge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  lockBadgeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  selectedBadge: {
    backgroundColor: 'rgba(255,215,0,0.22)',
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  selectedBadgeText: {
    color: '#ffd700',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  arenaName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 5,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  arenaDesc: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.2,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  confirmBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: 'rgba(240,223,192,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  backLabelShadow: {
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  confirmOuter: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#d4a820',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 12,
  },
  confirmPill: {
    height: 58,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
  confirmText: {
    color: '#1a0e00',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4,
  },
});
