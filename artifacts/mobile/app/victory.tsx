import * as Haptics from 'expo-haptics';
import { useFonts, Cinzel_700Bold, Cinzel_400Regular } from '@expo-google-fonts/cinzel';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import BackButton from '@/components/BackButton';
import CardCurtain from '@/components/CardCurtain';
import Animated, {
  cancelAnimation,
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

// ─── Luxury Confetti ──────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899', '#ffffff', '#a78bfa', '#f0abfc'];

interface ConfettiDef {
  id: number;
  x: number;
  w: number;
  h: number;
  borderRadius: number;
  color: string;
  delay: number;
  duration: number;
  driftX: number;
  fallY: number;
  rotation: number;
  glowing: boolean;
  opacity: number;
}

function generateConfetti(screenWidth: number, screenHeight: number): ConfettiDef[] {
  const defs: ConfettiDef[] = [];
  for (let i = 0; i < 74; i++) {
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]!;
    const base = 5 + Math.random() * 13;
    const shapeRoll = Math.random();
    let w: number, h: number, br: number;
    if (shapeRoll < 0.25) {
      // circle
      w = base; h = base; br = base / 2;
    } else if (shapeRoll < 0.5) {
      // thin horizontal ribbon
      w = base * 2.2; h = base * 0.38; br = 1;
    } else if (shapeRoll < 0.72) {
      // rounded square
      w = base; h = base; br = 3;
    } else if (shapeRoll < 0.88) {
      // tall shard
      w = base * 0.5; h = base * 2.1; br = 1;
    } else {
      // small square tile
      w = base * 1.3; h = base * 1.3; br = 4;
    }
    defs.push({
      id: i,
      x: Math.random() * screenWidth,
      w,
      h,
      borderRadius: br,
      color,
      delay: Math.random() * 700,
      duration: 1600 + Math.random() * 1600,
      driftX: (Math.random() - 0.5) * 130,
      fallY: screenHeight * 0.78 + Math.random() * screenHeight * 0.35,
      rotation: (Math.random() > 0.5 ? 1 : -1) * (80 + Math.random() * 640),
      glowing: Math.random() < 0.28,
      opacity: 0.7 + Math.random() * 0.3,
    });
  }
  return defs;
}

function ConfettiParticle({ def }: { def: ConfettiDef }) {
  const ty      = useSharedValue(0);
  const tx      = useSharedValue(0);
  const rot     = useSharedValue(0);
  const opacity = useSharedValue(def.opacity);

  useEffect(() => {
    ty.value = withDelay(def.delay, withTiming(def.fallY, {
      duration: def.duration,
      easing: Easing.in(Easing.quad),
    }));
    tx.value = withDelay(def.delay, withTiming(def.driftX, {
      duration: def.duration,
      easing: Easing.inOut(Easing.sin),
    }));
    rot.value = withDelay(def.delay, withTiming(def.rotation, {
      duration: def.duration,
    }));
    opacity.value = withDelay(
      def.delay + def.duration * 0.65,
      withTiming(0, { duration: def.duration * 0.35 }),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: ty.value },
      { translateX: tx.value },
      { rotateZ: `${rot.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const glowStyle = def.glowing
    ? { shadowColor: def.color, shadowOpacity: 0.85, shadowRadius: 7, shadowOffset: { width: 0, height: 0 }, elevation: 5 }
    : {};

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: def.x,
          top: -def.h,
          width: def.w,
          height: def.h,
          borderRadius: def.borderRadius,
          backgroundColor: def.color,
        },
        glowStyle,
        animStyle,
      ]}
    />
  );
}

const WAVE_INTERVAL_MS = 2500;
// max delay (700) + max duration (3200) + small buffer
const WAVE_LIFETIME_MS = 4200;

function ConfettiWave({ width, height }: { width: number; height: number }) {
  const defs = useMemo(() => generateConfetti(width, height), [width, height]);
  return (
    <>
      {defs.map((def) => (
        <ConfettiParticle key={def.id} def={def} />
      ))}
    </>
  );
}

function LuxuryConfetti({ visible, width, height }: { visible: boolean; width: number; height: number }) {
  const [waves, setWaves] = useState<number[]>([]);

  useEffect(() => {
    if (!visible) {
      setWaves([]);
      return;
    }

    function spawnWave() {
      const waveId = Date.now() + Math.random();
      setWaves((prev) => [...prev, waveId]);
      setTimeout(() => {
        setWaves((prev) => prev.filter((id) => id !== waveId));
      }, WAVE_LIFETIME_MS);
    }

    spawnWave();
    const interval = setInterval(spawnWave, WAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [visible]);

  if (!visible || waves.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {waves.map((waveId) => (
        <ConfettiWave key={waveId} width={width} height={height} />
      ))}
    </View>
  );
}

// ─── Wind-blown Dust (loss screen) ───────────────────────────────────────────

const DUST_COLORS = ['#8b7355', '#a08560', '#7a6348', '#b8997a', '#c4a882'];

interface DustDef {
  id: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  driftY: number;
  baseOpacity: number;
}

function buildDustDefs(screenWidth: number, screenHeight: number): DustDef[] {
  const defs: DustDef[] = [];
  for (let i = 0; i < 28; i++) {
    const size = 2 + Math.random() * 4;
    defs.push({
      id: i,
      y: Math.random() * screenHeight,
      size,
      color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)]!,
      duration: 5000 + Math.random() * 5000,
      delay: Math.random() * 8000,
      driftY: 6 + Math.random() * 18,
      baseOpacity: 0.18 + Math.random() * 0.32,
    });
  }
  return defs;
}

function DustParticle({ def, screenWidth }: { def: DustDef; screenWidth: number }) {
  const tx      = useSharedValue(-def.size);
  const ty      = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Sweep left → right, instant snap back, repeat indefinitely
    tx.value = withDelay(
      def.delay,
      withRepeat(
        withSequence(
          withTiming(screenWidth + def.size + 1, {
            duration: def.duration,
            easing: Easing.linear,
          }),
          withTiming(-def.size - 1, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    // Gentle vertical oscillation — independent of horizontal timing
    ty.value = withRepeat(
      withSequence(
        withTiming(def.driftY, {
          duration: def.duration * 0.55,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(-def.driftY * 0.4, {
          duration: def.duration * 0.45,
          easing: Easing.inOut(Easing.sin),
        }),
      ),
      -1,
      false,
    );
    // Fade in → hold → fade out in sync with horizontal cycle
    opacity.value = withDelay(
      def.delay,
      withRepeat(
        withSequence(
          withTiming(def.baseOpacity, { duration: def.duration * 0.18 }),
          withTiming(def.baseOpacity, { duration: def.duration * 0.62 }),
          withTiming(0, { duration: def.duration * 0.2 }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(opacity);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          top: def.y,
          width: def.size,
          height: def.size,
          borderRadius: def.size / 2,
          backgroundColor: def.color,
        },
        animStyle,
      ]}
    />
  );
}

function DustParticles({ width, height }: { width: number; height: number }) {
  const defs = useMemo(() => buildDustDefs(width, height), [width, height]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {defs.map((def) => (
        <DustParticle key={def.id} def={def} screenWidth={width} />
      ))}
    </View>
  );
}

// ─── Victory Screen ───────────────────────────────────────────────────────────

export default function VictoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { clearGame, joinQueue } = useGame();
  const params = useLocalSearchParams<{ winner: string; myId: string; opponentName: string }>();
  const [fontsLoaded] = useFonts({ Cinzel_700Bold, Cinzel_400Regular });

  const isWin = params.winner === params.myId;

  // Content starts fully visible so the crown renders beneath the CardCurtain
  // before the sweep begins. Only slideY animates in on reveal.
  const contentOpacity = useSharedValue(1);
  const slideY        = useSharedValue(28);

  const [curtainSweeping, setCurtainSweeping] = useState(false);
  const [confettiVisible, setConfettiVisible] = useState(false);

  const handleContentReady = useCallback(() => {
    contentOpacity.value = withTiming(1, { duration: 1 }); // no-op, already 1
    slideY.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) });
    if (isWin) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => setConfettiVisible(true), 1000);
    }
    setTimeout(() => setCurtainSweeping(true), 200);
  }, [isWin, contentOpacity, slideY]);

  const innerContentStyle = useAnimatedStyle(() => ({
    flex: 1,
    opacity: contentOpacity.value,
    transform: [{ translateY: slideY.value }],
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

  // ── LOSS SCREEN ─────────────────────────────────────────────────────────────
  if (!isWin) {
    return (
      <View style={[styles.container, styles.lossContainer]}>
        <DustParticles width={width} height={height} />
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

  // ── WIN SCREEN ──────────────────────────────────────────────────────────────
  const imageSize = Math.min(width * 0.82, 340);
  const topPad = insets.top + webTopPad + 16;
  const bottomPad = insets.bottom + 40;

  return (
    <View style={[styles.container, styles.winContainer]}>
      <Animated.View style={innerContentStyle}>
        <LuxuryConfetti visible={confettiVisible} width={width} height={height} />

        <View style={[styles.winInner, { paddingTop: topPad, paddingBottom: bottomPad }]}>
          <BackButton label="← HOME" onPress={handleLobby} />

          <View style={styles.winCenterBlock}>
            <View style={[{ width: imageSize, height: imageSize }, styles.winImageWrap]}>
              <Image
                source={crownWinImage}
                style={{ width: imageSize, height: imageSize }}
                resizeMode="contain"
              />
            </View>

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
