import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { type Card as CardType } from '@/contexts/GameContext';
import CardComponent from '@/components/Card';

const CARD_BOX = {
  md: { width: 56, height: 78 },
  lg: { width: 66, height: 92 },
} as const;

/**
 * Full-card preview that follows a finger.
 *
 * The resting hand, especially in landscape, sits in a short overflow:hidden
 * window so the lower edge of the fan can tuck under the table. A drag that
 * stays inside that window is sliced as it leaves the slot. A perspective
 * rotateX on the preview makes it worse: iOS rasterizes the 3D layer into the
 * view's layout box and cuts the face art (the bull, the crown, the indices)
 * through the middle while the finger moves.
 *
 * This host is a full-screen sibling of the board. It only translates. It does
 * not rotate in 3D, and it does not change the fan's layout, spread, or size.
 */
export default function DragCardGhost({
  card,
  size,
  dragX,
  dragY,
  dragVisible,
  dragScale,
  anchorX,
  anchorY,
}: {
  card: CardType;
  size: keyof typeof CARD_BOX;
  dragX: SharedValue<number>;
  dragY: SharedValue<number>;
  dragVisible: SharedValue<number>;
  dragScale: SharedValue<number>;
  /** Finger offset into the card, matching the previous ghost anchor. */
  anchorX: number;
  anchorY: number;
}) {
  const box = CARD_BOX[size];
  const liftStyle = useAnimatedStyle(() => ({
    opacity: dragVisible.value,
    transform: [
      { translateX: dragX.value - anchorX },
      { translateY: dragY.value - anchorY },
      { scale: dragScale.value },
    ],
  }));

  return (
    <View pointerEvents="none" collapsable={false} style={styles.host}>
      <Animated.View
        style={[
          styles.cardLift,
          { width: box.width, height: box.height },
          liftStyle,
        ]}
      >
        <CardComponent card={card} size={size} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    elevation: 24,
    overflow: 'visible',
  },
  cardLift: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'visible',
  },
});
