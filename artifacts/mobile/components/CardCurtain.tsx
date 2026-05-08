import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const CARD_W = 72;
const CARD_H = 100;
const GAP = 4;
const ENTER_DURATION = 650;
const EXIT_DURATION = 500;
const HOLD_AFTER_LAND = 1000;

interface CardSpec {
  id: number;
  col: number;
  row: number;
  x: number;
  y: number;
  enterDelay: number;
  exitDelay: number;
  exitTranslateX: number;
  initTranslateY: number;
}

interface CurtainCardProps {
  spec: CardSpec;
  sweeping: boolean;
  screenHeight: number;
}

function CurtainCard({ spec, sweeping, screenHeight }: CurtainCardProps) {
  const translateY = useSharedValue(spec.initTranslateY);
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      spec.enterDelay,
      withTiming(0, { duration: ENTER_DURATION, easing: Easing.in(Easing.quad) }),
    );
  }, []);

  useEffect(() => {
    if (sweeping) {
      translateY.value = withDelay(
        spec.exitDelay,
        withTiming(screenHeight + CARD_H, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) }),
      );
      translateX.value = withDelay(
        spec.exitDelay,
        withTiming(spec.exitTranslateX, { duration: EXIT_DURATION, easing: Easing.in(Easing.quad) }),
      );
    }
  }, [sweeping]);

  const animStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: spec.x,
    top: spec.y,
    width: CARD_W,
    height: CARD_H,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  return (
    <Animated.View style={animStyle}>
      <LinearGradient
        colors={['#1F0F3D', '#070412', '#1F0F3D']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.face}
      >
        <View style={styles.backInner} />
        <Text style={styles.crownText}>♛</Text>
      </LinearGradient>
    </Animated.View>
  );
}

interface CardCurtainProps {
  onContentReady: () => void;
  sweeping: boolean;
}

export default function CardCurtain({ onContentReady, sweeping }: CardCurtainProps) {
  const { width, height } = useWindowDimensions();
  const wrapperOpacity = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { cards, onReadyDelay } = useMemo(() => {
    const totalCols = Math.floor(width / (CARD_W + GAP));
    const totalRows = Math.ceil(height / (CARD_H + GAP)) + 1;
    const extraX = (width - totalCols * (CARD_W + GAP) + GAP) / 2;
    const centerCol = (totalCols - 1) / 2;
    const specs: CardSpec[] = [];
    let id = 0;
    let maxEnterEnd = 0;

    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
        const enterDelay = col * 55 + row * 35 + Math.random() * 40;
        const enterEnd = enterDelay + ENTER_DURATION;
        if (enterEnd > maxEnterEnd) maxEnterEnd = enterEnd;

        const exitDelay = (totalRows - 1 - row) * 40 + col * 20;

        const colOffset = centerCol > 0 ? (col - centerCol) / centerCol : 0;
        const exitTranslateX = colOffset * width * 0.55;

        const initTranslateY = -(row * (CARD_H + GAP) + CARD_H + 50 + Math.random() * 80);

        specs.push({
          id: id++,
          col,
          row,
          x: extraX + col * (CARD_W + GAP),
          y: row * (CARD_H + GAP),
          enterDelay,
          exitDelay,
          exitTranslateX,
          initTranslateY,
        });
      }
    }

    return { cards: specs, onReadyDelay: Math.ceil(maxEnterEnd + HOLD_AFTER_LAND) };
  }, [width, height]);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onContentReady();
    }, onReadyDelay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onReadyDelay]);

  useEffect(() => {
    if (sweeping) {
      wrapperOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [sweeping]);

  const wrapperStyle = useAnimatedStyle(() => ({
    ...StyleSheet.absoluteFillObject,
    opacity: wrapperOpacity.value,
  }));

  return (
    <Animated.View style={wrapperStyle} pointerEvents="none">
      {cards.map((spec) => (
        <CurtainCard
          key={spec.id}
          spec={spec}
          sweeping={sweeping}
          screenHeight={height}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  face: {
    flex: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backInner: {
    position: 'absolute',
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.5)',
  },
  crownText: {
    fontSize: 26,
    lineHeight: 32,
    color: '#A855F7',
    textShadowColor: 'rgba(168,85,247,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
