import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ARENAS, type ArenaId, useCosmetics } from '@/contexts/CosmeticsContext';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import ArenaBackground from '@/components/ArenaBackground';

export default function ArenaPickerScreen() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const { arena, setArena } = useCosmetics();
  const { quickPlayBot, joinQueue, connectionStatus, gameView, isInQueue } = useGame();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<ArenaId>(arena);

  useEffect(() => {
    if (gameView) router.replace('/game');
  }, [gameView]);

  useEffect(() => {
    if (isInQueue) router.replace('/matchmaking');
  }, [isInQueue]);

  const handleConfirm = () => {
    if (connectionStatus !== 'connected') return;
    setArena(selected);
    if (mode === 'bot') {
      quickPlayBot();
    } else {
      joinQueue();
    }
  };

  const cardWidth = Math.min(width * 0.88, 420);
  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0030', '#0a0018', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + webTopPad + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>← BACK</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>CHOOSE YOUR ARENA</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {mode === 'bot' ? 'Quick Play · Bot' : 'Ranked Match'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 112 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {ARENAS.map((arenaItem) => {
          const isSelected = selected === arenaItem.id;
          const isLocked = arenaItem.premium;

          return (
            <Pressable
              key={arenaItem.id}
              onPress={() => { if (!isLocked) setSelected(arenaItem.id); }}
              style={({ pressed }) => [
                styles.card,
                {
                  width: cardWidth,
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

              <View style={styles.cardInner}>
                <View style={styles.badgeRow}>
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
              {connectionStatus === 'connected' ? 'PLAY ON THIS ARENA' : 'CONNECTING...'}
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
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 10,
  },
  backText: { fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  subtitle: { fontSize: 11, letterSpacing: 2, marginTop: 5, textAlign: 'center' },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 4,
    gap: 14,
  },
  card: {
    height: 200,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cardInner: {
    padding: 16,
    justifyContent: 'space-between',
    flex: 1,
  },
  badgeRow: {
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
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  arenaDesc: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  confirmBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    backgroundColor: 'rgba(7,0,15,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
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
