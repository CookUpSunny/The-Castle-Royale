import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { CardBack } from './Card';

export interface DrawPileHandle {
  getPosition: () => Promise<{ x: number; y: number; width: number; height: number }>;
}

/** Match the portrait draw deck: the card stack, including the peek, is 30% larger. */
const DRAW_STACK_SCALE = 1.3;

const DrawPileStack = forwardRef<DrawPileHandle, { count: number }>(({ count }, ref) => {
  const colors = useColors();
  const viewRef = useRef<View>(null);

  useImperativeHandle(ref, () => ({
    getPosition: () =>
      new Promise((resolve, reject) => {
        if (!viewRef.current) {
          reject(new Error('DrawPileStack ref not mounted'));
          return;
        }
        viewRef.current.measure((_x, _y, width, height, pageX, pageY) => {
          resolve({ x: pageX, y: pageY, width, height });
        });
      }),
  }));

  if (count === 0) {
    return (
      <View ref={viewRef} style={styles.wrap}>
        <View style={[styles.emptyCard, { borderColor: colors.border, width: 40 * DRAW_STACK_SCALE, height: 56 * DRAW_STACK_SCALE }]}>
          <Text style={[styles.emptyGlyph, { color: colors.mutedForeground }]}>✦</Text>
        </View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>DRAW</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>0</Text>
      </View>
    );
  }

  return (
    <View ref={viewRef} style={styles.wrap}>
      <View style={styles.stack}>
        <View style={styles.card2}>
          <CardBack size="sm" scale={DRAW_STACK_SCALE} />
        </View>
        <View style={styles.card1}>
          <CardBack size="sm" scale={DRAW_STACK_SCALE} />
        </View>
        <View style={styles.card0}>
          <CardBack size="sm" scale={DRAW_STACK_SCALE} />
        </View>
      </View>
      <Text style={[styles.label, { color: colors.neonGold }]}>DRAW</Text>
      <Text style={[styles.count, { color: colors.neonGold }]}>{count}</Text>
    </View>
  );
});

DrawPileStack.displayName = 'DrawPileStack';
export default DrawPileStack;

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  stack: {
    width: 44 * DRAW_STACK_SCALE,
    height: 62 * DRAW_STACK_SCALE,
    position: 'relative',
    marginBottom: 2,
  },
  card2: {
    position: 'absolute',
    transform: [{ translateX: 4 * DRAW_STACK_SCALE }, { translateY: 4 * DRAW_STACK_SCALE }, { rotate: '4deg' }],
    opacity: 0.45,
  },
  card1: {
    position: 'absolute',
    transform: [{ translateX: 2 * DRAW_STACK_SCALE }, { translateY: 2 * DRAW_STACK_SCALE }, { rotate: '2deg' }],
    opacity: 0.7,
  },
  card0: {
    position: 'absolute',
  },
  emptyCard: {
    width: 40,
    height: 56,
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  emptyGlyph: {
    fontSize: 18,
  },
  label: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  count: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
});
