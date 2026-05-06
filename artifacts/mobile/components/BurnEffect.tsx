import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface Spark {
  id: number;
  angle: number;
  distance: number;
  color: string;
}

interface SparkParticleProps {
  spark: Spark;
  onDone?: () => void;
}

function SparkParticle({ spark, onDone }: SparkParticleProps) {
  const opacity = useSharedValue(1);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 600 });
    opacity.value = withDelay(
      300,
      withTiming(0, { duration: 300 }, (finished) => {
        if (finished && onDone) runOnJS(onDone)();
      }),
    );
    // One-shot burst per particle mount — shared-value objects are unstable deps across RN runtimes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const x = Math.cos(spark.angle) * spark.distance * progress.value;
    const y = Math.sin(spark.angle) * spark.distance * progress.value;
    return {
      opacity: opacity.value,
      transform: [{ translateX: x }, { translateY: y }, { scale: 1 - progress.value * 0.5 }],
    };
  });

  return (
    <Animated.View
      style={[styles.spark, { backgroundColor: spark.color }, animStyle]}
    />
  );
}

interface BurnEffectProps {
  visible: boolean;
  onComplete?: () => void;
  color?: string;
  center?: { x: number; y: number } | null;
}

const COLORS = ['#ff7f00', '#ff4500', '#ffd700', '#ff0000', '#c084fc'];

export default function BurnEffect({ visible, onComplete, color = '#ff7f00', center }: BurnEffectProps) {
  if (!visible) return null;

  const sparks: Spark[] = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i / 12) * Math.PI * 2,
    distance: 40 + Math.random() * 40,
    color: COLORS[i % COLORS.length]!,
  }));

  return (
    <View
      style={[
        styles.container,
        center
          ? {
              top: center.y,
              left: center.x,
            }
          : null,
      ]}
      pointerEvents="none"
    >
      {sparks.map((spark) => (
        <SparkParticle key={spark.id} spark={spark} onDone={spark.id === 0 ? onComplete : undefined} />
      ))}
      <View style={[styles.flash, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    zIndex: 100,
  },
  spark: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: -4,
    left: -4,
  },
  flash: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    top: -40,
    left: -40,
    opacity: 0.4,
  },
});
