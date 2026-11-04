import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

interface SplashStudioProps {
  onDone: () => void;
}

const WORDS = ['Vanro', 'Games'] as const;
const LINE_WIDTH = 210;

const FADE_IN_DUR = 560;
const LINE_DRAW_DUR = 500;
const HOLD_DUR = 880;
const FADE_OUT_DUR = 420;
const WORD_TOTAL = FADE_IN_DUR + HOLD_DUR + FADE_OUT_DUR;
const INITIAL_DELAY = 220;
const WORD_GAP = 110;

export default function SplashStudio({ onDone }: SplashStudioProps) {
  const { width, height } = useWindowDimensions();

  const opacity = useRef(WORDS.map(() => new Animated.Value(0))).current;
  const translateY = useRef(WORDS.map(() => new Animated.Value(30))).current;
  const scale = useRef(WORDS.map(() => new Animated.Value(0.91))).current;
  const lineWidth = useRef(WORDS.map(() => new Animated.Value(0))).current;

  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const settledRef = useRef(false);

  const finish = useCallback(() => {
    if (settledRef.current) return;
    settledRef.current = true;
    onDoneRef.current();
  }, []);

  useEffect(() => {
    const sequences = WORDS.map((_, i) => {
      const startDelay = INITIAL_DELAY + i * (WORD_TOTAL + WORD_GAP);
      return Animated.sequence([
        Animated.delay(startDelay),
        Animated.parallel([
          Animated.timing(opacity[i], {
            toValue: 1,
            duration: FADE_IN_DUR,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(translateY[i], {
            toValue: 0,
            duration: FADE_IN_DUR,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(scale[i], {
            toValue: 1,
            duration: FADE_IN_DUR,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(HOLD_DUR),
        Animated.parallel([
          Animated.timing(opacity[i], {
            toValue: 0,
            duration: FADE_OUT_DUR,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(translateY[i], {
            toValue: -24,
            duration: FADE_OUT_DUR,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]);
    });

    // Width cannot use the native driver. Mixing it into the parallel above
    // drops the completion callback on device, which left this splash up forever.
    const lines = WORDS.map((_, i) => {
      const startDelay = INITIAL_DELAY + i * (WORD_TOTAL + WORD_GAP);
      return Animated.sequence([
        Animated.delay(startDelay),
        Animated.timing(lineWidth[i], {
          toValue: LINE_WIDTH,
          duration: LINE_DRAW_DUR,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false,
        }),
      ]);
    });

    let tail: ReturnType<typeof setTimeout> | null = null;
    Animated.parallel(sequences).start(() => {
      tail = setTimeout(finish, 160);
    });
    Animated.parallel(lines).start();

    // Full wordmark is ~4.2s. Leave if the native callback never arrives.
    const backup = setTimeout(finish, 5000);
    return () => {
      if (tail) clearTimeout(tail);
      clearTimeout(backup);
    };
  }, [finish, lineWidth, opacity, scale, translateY]);

  return (
    <Pressable
      onPress={finish}
      accessibilityRole="button"
      accessibilityLabel="Skip intro"
      style={[styles.container, { width, height }]}
    >
      {WORDS.map((word, i) => (
        <Animated.View
          key={word}
          style={[
            StyleSheet.absoluteFill,
            styles.wordWrapper,
            {
              opacity: opacity[i],
              transform: [
                { translateY: translateY[i] },
                { scale: scale[i] },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.wordText}>{word}</Text>
          <View style={styles.lineTrack}>
            <Animated.View style={[styles.ruleLine, { width: lineWidth[i] }]} />
          </View>
        </Animated.View>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 9998,
    backgroundColor: '#000',
  },
  wordWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordText: {
    color: '#ffffff',
    fontSize: 54,
    fontWeight: '700',
    letterSpacing: 14,
    textTransform: 'uppercase',
    fontFamily: 'Inter_700Bold',
  },
  lineTrack: {
    marginTop: 14,
    width: LINE_WIDTH,
    overflow: 'hidden',
  },
  ruleLine: {
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});
