import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';
import BackButton from '@/components/BackButton';
import { useDuoWindow } from '@/hooks/useDuoWindow';

export default function ModeSelectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { connectionStatus } = useGame();

  const goPrivate = () => {
    if (connectionStatus !== 'connected') return;
    router.push('/arena-picker?mode=private');
  };

  const goBot = () => {
    if (connectionStatus !== 'connected') return;
    router.push('/arena-picker?mode=bot');
  };

  const goOnline = () => {
    if (connectionStatus !== 'connected') return;
    router.push('/arena-picker?mode=online');
  };

  const webTopPad = Platform.OS === 'web' ? 8 : 0;
  const duo = useDuoWindow();
  const verticalBook = duo.hinge === 'vertical';
  const split = duo.mode !== 'compact';
  const shortFold = duo.mode === 'compact' && duo.height < 700;
  const isConnected = connectionStatus === 'connected';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#200040', '#0a0018', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.inner, {
        paddingTop: insets.top + webTopPad + 12,
        paddingBottom: insets.bottom + 20,
        paddingLeft: insets.left + 16,
        paddingRight: insets.right + 16,
        flexDirection: verticalBook ? 'row' : 'column',
        alignItems: verticalBook ? 'stretch' : 'center',
      }]}>
        <View style={[styles.pane, shortFold && { flex: 0, justifyContent: 'flex-start' }]}>
          <View style={styles.headerRow}>
            <BackButton label="← BACK" onPress={() => router.back()} />
            <View style={{ flex: 1 }} />
          </View>

          <View style={styles.titleBlock}>
            <Text style={[styles.crown, { color: colors.neonGold }, shortFold && { fontSize: 22, marginBottom: 0 }]}>♛</Text>
            <Text style={[styles.title, { color: colors.foreground }, shortFold && { fontSize: 28, letterSpacing: 5 }]}>SELECT</Text>
            <Text style={[styles.titleSub, { color: colors.neonGold }, shortFold && { fontSize: 13, letterSpacing: 3 }]}>YOUR BATTLE</Text>
          </View>
        </View>

        {split ? (
          <View pointerEvents="none" style={verticalBook ? { width: duo.creaseBand } : { height: duo.creaseBand }} />
        ) : null}

        <View style={styles.pane}>
        <View style={[styles.buttonsBlock, shortFold && { gap: 8 }]}>
          <Pressable
            onPress={goBot}
            disabled={!isConnected}
            style={({ pressed }) => [styles.bigBtnOuter, pressed && { opacity: 0.86 }]}
          >
            <LinearGradient
              colors={isConnected ? ['#f5e070', '#d4a820', '#f5e070'] : ['#3a3020', '#1e1a0a', '#3a3020']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bigBtn, shortFold && styles.bigBtnShort]}
            >
              <Text style={[styles.bigBtnIcon, shortFold && styles.bigBtnIconShort, !isConnected && { color: '#5a5030' }]}>⚡</Text>
              <Text style={[styles.bigBtnText, shortFold && { fontSize: 16, letterSpacing: 2 }, !isConnected && { color: '#5a5030' }]}>PLAY QUICK GAME</Text>
              <Text style={[styles.bigBtnSubText, !isConnected && { color: '#5a5030' }]}>· BOT ·</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={goOnline}
            disabled={!isConnected}
            style={({ pressed }) => [styles.bigBtnOuter, styles.tealShadow, pressed && { opacity: 0.86 }]}
          >
            <LinearGradient
              colors={isConnected ? ['#22d3ee', '#0891b2', '#0e7490'] : ['#0a2428', '#051214', '#0a2428']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bigBtn, shortFold && styles.bigBtnShort]}
            >
              <Text style={[styles.bigBtnIcon, shortFold && styles.bigBtnIconShort, { color: '#fff' }, !isConnected && { color: '#1a4048' }]}>🌐</Text>
              <Text style={[styles.bigBtnText, shortFold && { fontSize: 16, letterSpacing: 2 }, { color: '#fff' }, !isConnected && { color: '#1a4048' }]}>PLAY ONLINE</Text>
              <Text style={[styles.bigBtnSubText, { color: 'rgba(255,255,255,0.78)' }, !isConnected && { color: '#1a4048' }]}>
                · FIND AN OPPONENT ·
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={goPrivate}
            disabled={!isConnected}
            style={({ pressed }) => [styles.bigBtnOuter, pressed && { opacity: 0.86 }]}
          >
            <LinearGradient
              colors={isConnected ? ['#a855f7', '#7e22ce', '#5b21b6'] : ['#2a1040', '#15081e', '#2a1040']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.bigBtn, shortFold && styles.bigBtnShort]}
            >
              <Text style={[styles.bigBtnIcon, shortFold && styles.bigBtnIconShort, { color: '#fff' }, !isConnected && { color: '#5a4078' }]}>♛</Text>
              <Text style={[styles.bigBtnText, shortFold && { fontSize: 16, letterSpacing: 2 }, { color: '#fff' }, !isConnected && { color: '#5a4078' }]}>PLAY PRIVATE ROOM</Text>
              <Text style={[styles.bigBtnSubText, { color: 'rgba(255,255,255,0.78)' }, !isConnected && { color: '#5a4078' }]}>· INVITE A FRIEND ·</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.connectionDot}>
          <View style={[styles.dot, { backgroundColor: isConnected ? '#22c55e' : '#ef4444' }]} />
          <Text style={[styles.connectionText, { color: colors.mutedForeground }]}>
            {isConnected ? 'ONLINE' : connectionStatus.toUpperCase()}
          </Text>
        </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  pane: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'center' },
  titleBlock: { alignItems: 'center', marginTop: 12 },
  crown: { fontSize: 32, marginBottom: 4, textShadowColor: '#c8960a', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  title: { fontSize: 38, fontWeight: '900', letterSpacing: 8 },
  titleSub: { fontSize: 16, fontWeight: '700', letterSpacing: 5, marginTop: -2 },
  buttonsBlock: { width: '100%', gap: 18 },
  bigBtnOuter: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#d4a820',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 14,
  },
  tealShadow: {
    shadowColor: '#0891b2',
  },
  bigBtn: { paddingVertical: 26, justifyContent: 'center', alignItems: 'center', borderRadius: 18 },
  bigBtnShort: { paddingVertical: 10 },
  bigBtnIcon: { fontSize: 28, fontWeight: '900', color: '#1a0e00', marginBottom: 6 },
  bigBtnIconShort: { fontSize: 18, marginBottom: 2 },
  bigBtnText: { color: '#1a0e00', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  bigBtnSubText: { color: '#1a0e00', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginTop: 4, opacity: 0.8 },
  connectionDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connectionText: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5 },
});
