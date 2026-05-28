import * as Haptics from 'expo-haptics';
import { useFonts, Cinzel_700Bold, Cinzel_400Regular } from '@expo-google-fonts/cinzel';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import BackButton from '@/components/BackButton';
import CardCurtain from '@/components/CardCurtain';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';

const crownWinImage = require('../assets/crown-win.png');
const crownLossImage = require('../assets/crown-loss.png');

const SERIF_BOLD = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });
const SERIF_REGULAR = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const PARTICLE_COLORS = ['#fbbf24', '#10b981', '#ffffff', '#f97316'];

interface ParticleDef {
  id: number;
  originX: number;
  originY: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
}

function Particle({ def }: { def: ParticleDef }) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(def.delay, withTiming(1, { duration: 80 }));
    tx.value = withDelay(def.delay, withTiming(def.vx, { duration: def.duration, easing: Easing.out(Easing.quad) }));
    ty.value = withDelay(
      def.delay,
      withTiming(def.vy, { duration: def.duration, easing: Easing.in(Easing.quad) }),
    );
    opacity.value = withDelay(
      def.delay + def.duration * 0.3,
      withTiming(0, { duration: def.duration * 0.7 }),
    );
    scale.value = withDelay(def.delay, withTiming(0, { duration: def.duration }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: def.originX - def.size / 2,
          top: def.originY - def.size / 2,
          width: def.size,
          height: def.size,
          borderRadius: def.size / 2,
          backgroundColor: def.color,
        },
        style,
      ]}
    />
  );
}

function Fireworks({ width, height }: { width: number; height: number }) {
  const particles = useMemo<ParticleDef[]>(() => {
    const origins = [
      { x: width * 0.22, y: height * 0.22 },
      { x: width * 0.5,  y: height * 0.15 },
      { x: width * 0.78, y: height * 0.22 },
    ];
    const defs: ParticleDef[] = [];
    let id = 0;
    origins.forEach((origin, oi) => {
      const count = 14;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 60 + Math.random() * 110;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed + 80 + Math.random() * 60;
        defs.push({
          id: id++,
          originX: origin.x,
          originY: origin.y,
          vx,
          vy,
          color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]!,
          size: 5 + Math.random() * 5,
          duration: 900 + Math.random() * 500,
          delay: oi * 120 + Math.random() * 80,
        });
      }
    });
    return defs;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((def) => (
        <Particle key={def.id} def={def} />
      ))}
    </View>
  );
}

export default function VictoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { clearGame, joinQueue } = useGame();
  const params = useLocalSearchParams<{ winner: string; myId: string; opponentName: string }>();
  const [fontsLoaded] = useFonts({ Cinzel_700Bold, Cinzel_400Regular });

  const isWin = params.winner === params.myId;

  // No scale animation — images always render at their natural full resolution.
  // Entrance is driven purely by opacity (fade) + a subtle translateY slide.
  const contentOpacity = useSharedValue(0);
  const slideY        = useSharedValue(28);   // slides up 28 px on reveal
  const glowPulse     = useSharedValue(1);

  const [curtainSweeping, setCurtainSweeping] = useState(false);

  const handleContentReady = useCallback(() => {
    contentOpacity.value = withTiming(1, { duration: 380 });
    slideY.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
    if (isWin) {
      glowPulse.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 1400 }), withTiming(0.97, { duration: 1400 })),
        -1,
        true,
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setTimeout(() => setCurtainSweeping(true), 200);
  }, [isWin]);

  // The entire visible content fades + slides up together — images always at
  // scale 1 so React Native rasterises them at full native resolution.
  const innerContentStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: contentOpacity.value,
    transform: [{ translateY: slideY.value }],
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
  const cinzelBold = fontsLoaded ? 'Cinzel_700Bold' : SERIF_BOLD;
  const cinzelRegular = fontsLoaded ? 'Cinzel_400Regular' : SERIF_REGULAR;

  // ── LOSS SCREEN ────────────────────────────────────────────────────────────
  if (!isWin) {
    return (
      <View style={[styles.container, styles.lossContainer]}>
        <Animated.View style={innerContentStyle}>
          <View style={[styles.inner, { paddingTop: insets.top + webTopPad + 16, paddingBottom: insets.bottom + 40 }]}>
            <BackButton label="← HOME" onPress={handleLobby} />

            <View style={styles.lossCenterBlock}>
              <Image
                source={crownLossImage}
                style={styles.crownImage}
                resizeMode="contain"
              />
              <Text style={[styles.lossTitle, { fontFamily: cinzelBold }]}>YOU LOSE</Text>
              <Text style={[styles.lossSub, { fontFamily: cinzelRegular }]}>
                {params.opponentName ?? 'Opponent'} claims victory
              </Text>
            </View>

            <View style={styles.buttonSection}>
              <Pressable
                onPress={handlePlayAgain}
                style={({ pressed }) => [styles.lossPrimaryBtn, pressed && { opacity: 0.8 }]}
              >
                <Text style={[styles.lossPrimaryBtnText, { fontFamily: cinzelBold }]}>PLAY AGAIN</Text>
              </Pressable>
              <Pressable onPress={handleLobby} style={styles.lossSecondaryBtn}>
                <Text style={[styles.lossSecondaryBtnText, { fontFamily: cinzelRegular }]}>BACK TO LOBBY</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
        <CardCurtain onContentReady={handleContentReady} sweeping={curtainSweeping} />
      </View>
    );
  }

  // ── WIN SCREEN ─────────────────────────────────────────────────────────────
  const imageSize = Math.min(width * 0.82, 340);
  const topPad = insets.top + webTopPad + 16;
  const bottomPad = insets.bottom + 40;

  return (
    <View style={[styles.container, styles.winContainer]}>
      <Animated.View style={innerContentStyle}>
        <Fireworks width={width} height={height} />

        <View style={[styles.winInner, { paddingTop: topPad, paddingBottom: bottomPad }]}>
          <BackButton label="← HOME" onPress={handleLobby} />

          <View style={styles.winCenterBlock}>
            <Animated.View style={[{ width: imageSize, height: imageSize }, styles.winImageWrap, glowStyle]}>
              <Image
                source={crownWinImage}
                style={{ width: imageSize, height: imageSize }}
                resizeMode="contain"
              />
            </Animated.View>

            <Text style={[styles.winTitle, { fontFamily: cinzelBold }]}>YOU WIN</Text>
            <Text style={[styles.winSub, { fontFamily: cinzelRegular }]}>
              {params.opponentName ?? 'Opponent'} has been outplayed
            </Text>
          </View>

          <View style={styles.buttonSection}>
            <Pressable
              onPress={handlePlayAgain}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
            >
              <LinearGradient
                colors={['#fbbf24', '#f59e0b', '#d97706']}
                style={styles.primaryBtnInner}
              >
                <Text style={[styles.primaryBtnText, { fontFamily: cinzelBold }]}>PLAY AGAIN</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleLobby}
              style={styles.winSecondaryBtn}
            >
              <Text style={[styles.winSecondaryBtnText, { fontFamily: cinzelRegular }]}>BACK TO LOBBY</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
      <CardCurtain onContentReady={handleContentReady} sweeping={curtainSweeping} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  winContainer: { backgroundColor: '#000000' },
  lossContainer: { backgroundColor: '#FFFFFF' },

  // ── Win layout
  winInner: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28 },
  winCenterBlock: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: '15%' },
  winImageWrap: { alignItems: 'center', justifyContent: 'center' },
  winTitle: {
    fontSize: 46,
    fontWeight: '700',
    letterSpacing: 10,
    color: '#fbbf24',
    textAlign: 'center',
    marginTop: 8,
  },
  winSub: {
    fontSize: 13,
    color: 'rgba(251,191,36,0.6)',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 6,
  },
  winSecondaryBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(251,191,36,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  winSecondaryBtnText: {
    color: 'rgba(251,191,36,0.55)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
  },

  // ── Loss layout
  inner: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 32 },
  lossCenterBlock: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: 8 },
  crownImage: { width: 260, height: 260, marginBottom: 12 },
  lossTitle: {
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  lossSub: {
    fontSize: 14,
    color: 'rgba(26,26,26,0.55)',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 6,
  },
  lossPrimaryBtn: {
    height: 58,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  lossPrimaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 4 },
  lossSecondaryBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(26,26,26,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lossSecondaryBtnText: { color: 'rgba(26,26,26,0.6)', fontSize: 13, fontWeight: '700', letterSpacing: 3 },

  // ── Shared buttons
  buttonSection: { width: '100%', gap: 12 },
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 12,
  },
  primaryBtnInner: { height: 58, justifyContent: 'center', alignItems: 'center', borderRadius: 14 },
  primaryBtnText: { color: '#07000f', fontSize: 17, fontWeight: '900', letterSpacing: 3 },
});
