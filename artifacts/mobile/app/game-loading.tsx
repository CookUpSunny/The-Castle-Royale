import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useGame } from '@/contexts/GameContext';
import { useMusicPlayer } from '@/contexts/MusicContext';
import { useColors } from '@/hooks/useColors';

const LOADING_MS = 2500;
const MAX_WAIT_MS = 8000;

const SUITS: { glyph: string; color: string }[] = [
  { glyph: '♠', color: '#1a0e00' },
  { glyph: '♥', color: '#c91111' },
  { glyph: '♣', color: '#1a0e00' },
  { glyph: '♦', color: '#c91111' },
  { glyph: '♠', color: '#1a0e00' },
];

/**
 * Floating + flipping playing card. Rotates around the Y axis (3-D flip) and
 * gently bobs up and down. Each card gets its own timing offset so the group
 * looks alive instead of marching in lockstep.
 */
function FloatingCard({
  glyph,
  color,
  delay,
  flipDuration,
  bobDuration,
  bobAmplitude,
  offsetX,
  rotateZ,
}: {
  glyph: string;
  color: string;
  delay: number;
  flipDuration: number;
  bobDuration: number;
  bobAmplitude: number;
  offsetX: number;
  rotateZ: number;
}) {
  const flip = useSharedValue(0);
  const bob = useSharedValue(0);

  useEffect(() => {
    flip.value = withTiming(0, { duration: delay }, () => {
      flip.value = withRepeat(
        withTiming(360, { duration: flipDuration, easing: Easing.linear }),
        -1,
        false,
      );
    });
    bob.value = withRepeat(
      withSequence(
        withTiming(-bobAmplitude, { duration: bobDuration, easing: Easing.inOut(Easing.sin) }),
        withTiming(bobAmplitude, { duration: bobDuration, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX },
      { translateY: bob.value },
      { perspective: 800 },
      { rotateZ: `${rotateZ}deg` },
      { rotateY: `${flip.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <LinearGradient
        colors={['#fafafa', '#e8d8c4', '#fafafa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.cardInner}>
        <Text style={[styles.cardCornerText, { color }]}>A</Text>
        <Text style={[styles.cardSuit, { color }]}>{glyph}</Text>
        <Text style={[styles.cardCornerTextBottom, { color }]}>A</Text>
      </View>
    </Animated.View>
  );
}

export default function GameLoadingScreen() {
  const colors = useColors();
  const { stopMusic, startMusic } = useMusicPlayer();
  const { gameView } = useGame();

  // Pulse the "ENTERING THE ARENA..." text.
  const captionOpacity = useSharedValue(0.5);

  // One-shot navigation guard. Even if this screen accidentally remounts, we
  // only ever advance to /game once.
  const navigatedRef = useRef(false);
  // Once the minimum animation time has elapsed, we're allowed to advance as
  // soon as gameView is available. Triggers a re-render so the gameView effect
  // can pick it up.
  const [animationDone, setAnimationDone] = useState(false);

  // Mount: fade splash out, start the animation timer, set a hard ceiling.
  useEffect(() => {
    captionOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );

    stopMusic();

    const minT = setTimeout(() => setAnimationDone(true), LOADING_MS);

    // Hard ceiling: if the game still hasn't arrived after MAX_WAIT_MS,
    // advance anyway. /game has its own loading state so this is safe.
    const maxT = setTimeout(() => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      startMusic();
      router.replace('/game');
    }, MAX_WAIT_MS);

    return () => {
      clearTimeout(minT);
      clearTimeout(maxT);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Advance when BOTH the minimum animation time has elapsed AND the server
  // has delivered a gameView. Prevents landing on /game with no state.
  useEffect(() => {
    if (!animationDone || !gameView || navigatedRef.current) return;
    navigatedRef.current = true;
    startMusic();
    router.replace('/game');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationDone, gameView]);

  const captionStyle = useAnimatedStyle(() => ({ opacity: captionOpacity.value }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#200040', '#0a0018', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.cardField}>
        <FloatingCard
          glyph={SUITS[0].glyph}
          color={SUITS[0].color}
          delay={0}
          flipDuration={2400}
          bobDuration={1400}
          bobAmplitude={14}
          offsetX={-110}
          rotateZ={-12}
        />
        <FloatingCard
          glyph={SUITS[1].glyph}
          color={SUITS[1].color}
          delay={120}
          flipDuration={2000}
          bobDuration={1100}
          bobAmplitude={10}
          offsetX={-50}
          rotateZ={-4}
        />
        <FloatingCard
          glyph={SUITS[2].glyph}
          color={SUITS[2].color}
          delay={240}
          flipDuration={2700}
          bobDuration={1600}
          bobAmplitude={18}
          offsetX={10}
          rotateZ={3}
        />
        <FloatingCard
          glyph={SUITS[3].glyph}
          color={SUITS[3].color}
          delay={360}
          flipDuration={2200}
          bobDuration={1300}
          bobAmplitude={12}
          offsetX={70}
          rotateZ={9}
        />
        <FloatingCard
          glyph={SUITS[4].glyph}
          color={SUITS[4].color}
          delay={480}
          flipDuration={2500}
          bobDuration={1500}
          bobAmplitude={16}
          offsetX={130}
          rotateZ={14}
        />
      </View>

      <Animated.Text style={[styles.caption, { color: colors.neonGold }, captionStyle]}>
        ENTERING THE ARENA...
      </Animated.Text>
    </View>
  );
}

const CARD_W = 72;
const CARD_H = 104;

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardField: {
    width: '100%',
    height: CARD_H + 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 14,
    borderWidth: 1,
    borderColor: 'rgba(212,168,32,0.6)',
  },
  cardInner: {
    flex: 1,
    padding: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardCornerText: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '900' },
  cardCornerTextBottom: { alignSelf: 'flex-end', fontSize: 14, fontWeight: '900', transform: [{ rotate: '180deg' }] },
  cardSuit: { fontSize: 38, fontWeight: '900' },
  caption: {
    marginTop: 60,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 5,
    textAlign: 'center',
  },
});
