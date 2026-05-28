import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
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
          Animated.timing(lineWidth[i], {
            toValue: LINE_WIDTH,
            duration: LINE_DRAW_DUR,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
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

    Animated.parallel(sequences).start(() => {
      setTimeout(onDone, 160);
    });
  }, []);

  return (
    <View style={[styles.container, { width, height }]}>
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
    </View>
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
