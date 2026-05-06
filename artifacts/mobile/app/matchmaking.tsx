import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import { PortalSpinner } from '@/components/PortalSpinner';

export default function MatchmakingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cancelQueue, queueSeconds, gameView, isInQueue } = useGame();

  useEffect(() => {
    if (gameView) {
      router.replace('/game');
    }
  }, [gameView]);

  // If queue exits without producing a game (server cancellation, error), go back to
  // the lobby. Use a small grace window because joinQueue() is async — we don't want
  // to bounce away in the brief moment between mounting and the server's queue_joined
  // ack. Always router.replace('/') (never router.back()) since this screen is often
  // entered via replace() from the victory screen, leaving no back stack.
  useEffect(() => {
    if (isInQueue || gameView) return;
    const t = setTimeout(() => {
      if (!isInQueue && !gameView) router.replace('/');
    }, 800);
    return () => clearTimeout(t);
  }, [isInQueue, gameView]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#200040', '#0a0018', '#07000f']} style={StyleSheet.absoluteFill} />

      <View style={[styles.inner, { paddingTop: insets.top + webTopPad + 40, paddingBottom: insets.bottom + 40 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>FINDING</Text>
        <Text style={[styles.titleSub, { color: colors.neonGold }]}>OPPONENT</Text>

        <PortalSpinner size={220} />

        <Text style={[styles.timer, { color: colors.foreground }]}>{fmt(queueSeconds)}</Text>
        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Searching for a worthy challenger...</Text>

        <Pressable
          onPress={() => { cancelQueue(); router.replace('/'); }}
          style={[styles.cancelBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>CANCEL</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  title: { fontSize: 36, fontWeight: '900', letterSpacing: 8 },
  titleSub: { fontSize: 18, fontWeight: '700', letterSpacing: 6, marginTop: -6 },
  timer: { fontSize: 48, fontWeight: '300', letterSpacing: 4 },
  statusText: { fontSize: 13, letterSpacing: 1, textAlign: 'center' },
  cancelBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: '700', letterSpacing: 3 },
});
