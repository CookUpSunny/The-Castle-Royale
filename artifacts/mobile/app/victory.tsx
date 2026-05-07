import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import BackButton from '@/components/BackButton';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';

export default function VictoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { clearGame, joinQueue } = useGame();
  const params = useLocalSearchParams<{ winner: string; myId: string; opponentName: string }>();

  const isWin = params.winner === params.myId;
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const rewardScale = useSharedValue(0);
  const glowPulse = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 100 });
    opacity.value = withTiming(1, { duration: 600 });
    rewardScale.value = withDelay(400, withSpring(1, { damping: 14 }));
    glowPulse.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 1200 }), withTiming(0.95, { duration: 1200 })),
      -1,
      true,
    );
  }, []);

  const mainStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const rewardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowPulse.value }],
  }));

  const handlePlayAgain = () => {
    clearGame();
    joinQueue();
    router.replace('/matchmaking');
  };

  const handleLobby = () => {
    clearGame();
    router.replace('/');
  };

  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={isWin ? ['#1a0a00', '#3d1a00', '#07000f'] : ['#0a0030', '#1a0045', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.glowBg,
          glowStyle,
          { backgroundColor: isWin ? '#fbbf2420' : '#a855f720' },
          Platform.OS === 'web' ? ({ filter: 'blur(60px)' } as object) : null,
        ]}
      />

      <View style={[styles.inner, { paddingTop: insets.top + webTopPad + 16, paddingBottom: insets.bottom + 40 }]}>
        <BackButton label="← HOME" onPress={handleLobby} />

        <Animated.View style={[styles.resultSection, mainStyle]}>
          <Text style={[styles.resultEmoji, { color: isWin ? colors.neonGold : colors.neonPurple }]}>
            {isWin ? '♛' : '♟'}
          </Text>
          <Text style={[styles.resultTitle, { color: isWin ? colors.neonGold : colors.foreground }]}>
            {isWin ? 'YOU WIN!' : 'DEFEATED'}
          </Text>
          <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
            {isWin ? `${params.opponentName ?? 'Opponent'} has been outplayed` : `${params.opponentName ?? 'Opponent'} claims victory`}
          </Text>
        </Animated.View>

        {isWin && (
          <Animated.View style={[styles.rewardSection, rewardStyle]}>
            <View style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.rewardTitle, { color: colors.mutedForeground }]}>REWARDS</Text>
              <View style={styles.rewardRow}>
                <Text style={[styles.rewardValue, { color: colors.accent }]}>+2,500</Text>
                <Text style={[styles.rewardLabel, { color: colors.mutedForeground }]}>COINS</Text>
              </View>
              <View style={styles.rewardRow}>
                <Text style={[styles.rewardValue, { color: colors.electric }]}>+50</Text>
                <Text style={[styles.rewardLabel, { color: colors.mutedForeground }]}>GEMS</Text>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={styles.buttonSection}>
          <Pressable onPress={handlePlayAgain} style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}>
            <LinearGradient
              colors={['#fbbf24', '#f59e0b', '#d97706']}
              style={styles.primaryBtnInner}
            >
              <Text style={styles.primaryBtnText}>PLAY AGAIN</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={handleLobby}
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>BACK TO LOBBY</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  glowBg: {
    position: 'absolute',
    top: '20%',
    left: '10%',
    right: '10%',
    height: 300,
    borderRadius: 150,
    opacity: 0.9,
  },
  resultSection: { alignItems: 'center', marginTop: 20 },
  resultEmoji: { fontSize: 80, marginBottom: 8 },
  resultTitle: { fontSize: 52, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  resultSub: { fontSize: 14, marginTop: 8, textAlign: 'center', letterSpacing: 1 },
  rewardSection: { width: '100%' },
  rewardCard: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  rewardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 3 },
  rewardRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rewardValue: { fontSize: 36, fontWeight: '800' },
  rewardLabel: { fontSize: 13, fontWeight: '600', letterSpacing: 2 },
  buttonSection: { width: '100%', gap: 12 },
  primaryBtn: { borderRadius: 14, overflow: 'hidden', shadowColor: '#fbbf24', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 12 },
  primaryBtnInner: { height: 58, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  primaryBtnText: { color: '#07000f', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  secondaryBtn: { height: 50, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 3 },
});
