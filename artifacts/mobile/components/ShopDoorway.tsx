import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { CardBack } from '@/components/Card';
import { SHOP_DOORWAY_MS } from '@/lib/shopDoorway';

/**
 * Shop entrance. One overlay, above the navigator.
 *
 * The in-match OrientationCurtain stays on the game screen. This is the
 * only cover for the shop's landscape lock, so the two never stack.
 *
 * Lead: the equipped card back. It flies from the Shop button, splits into
 * doors, then the gold light rushes forward and covers the rotation.
 * Support: warm gold light and a static blur faded in on the push.
 * The shop underneath scales 1.08 → 1 while the light recedes.
 *
 * | Element | Role    | Starts | Duration | Motion                         |
 * | Card    | Lead    | 0      | 350ms    | scale + rotate to center       |
 * | Doors   | Lead    | 350    | 300ms    | rotateY halves, gold light     |
 * | Push    | Lead    | 650    | 250ms    | scale up, blur, gold/black     |
 * | Shop    | Support | cover  | 350ms    | scale 1.08→1, light recedes    |
 *
 * Reduced motion is a gold opacity crossfade with the same coverage.
 * Timings use ReduceMotion.Never so the OS setting cannot snap the cover
 * off before the orientation lock has finished.
 */

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const BACK_SCALE = 3;
const CARD_W = 66 * BACK_SCALE;
const CARD_H = 92 * BACK_SCALE;
const HALF = CARD_W / 2;

export type ShopDoorwayBeat = 'enter' | 'reveal' | 'exit' | 'exit-reveal';

interface ShopDoorwayProps {
  beat: ShopDoorwayBeat;
  reduced: boolean;
  origin: { x: number; y: number } | null;
  onCovered: () => void;
  onFinished: () => void;
}

function doorsOpened() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

let emitCovered = () => {};
let emitFinished = () => {};

function notifyCovered() {
  emitCovered();
}

function notifyFinished() {
  emitFinished();
}

function out(duration: number) {
  'worklet';
  return { duration, easing: EASE_OUT, reduceMotion: ReduceMotion.Never };
}

function inOut(duration: number) {
  'worklet';
  return { duration, easing: EASE_IN_OUT, reduceMotion: ReduceMotion.Never };
}

export default function ShopDoorway({
  beat,
  reduced,
  origin,
  onCovered,
  onFinished,
}: ShopDoorwayProps) {
  const { width, height } = useWindowDimensions();
  const onCoveredRef = useRef(onCovered);
  const onFinishedRef = useRef(onFinished);
  onCoveredRef.current = onCovered;
  onFinishedRef.current = onFinished;

  const widthSV = useSharedValue(width);
  const heightSV = useSharedValue(height);
  const originX = useSharedValue(origin?.x ?? width / 2);
  const originY = useSharedValue(origin?.y ?? height - 72);
  const flight = useSharedValue(beat === 'exit' || beat === 'exit-reveal' ? 1 : 0);
  const doors = useSharedValue(beat === 'exit' ? 1 : 0);
  const push = useSharedValue(0);
  const wash = useSharedValue(beat === 'reveal' || beat === 'exit-reveal' ? 1 : 0);
  const washScale = useSharedValue(1);
  const light = useSharedValue(beat === 'exit' ? 1 : 0);
  const blur = useSharedValue(0);
  const group = useSharedValue(reduced ? 0 : beat === 'reveal' || beat === 'exit-reveal' ? 0 : 1);

  useEffect(() => {
    widthSV.set(width);
    heightSV.set(height);
  }, [height, heightSV, width, widthSV]);

  useEffect(() => {
    emitCovered = () => onCoveredRef.current();
    emitFinished = () => onFinishedRef.current();
    originX.set(origin?.x ?? widthSV.get() / 2);
    originY.set(origin?.y ?? heightSV.get() - 72);

    const stop = () => {
      cancelAnimation(flight);
      cancelAnimation(doors);
      cancelAnimation(push);
      cancelAnimation(wash);
      cancelAnimation(washScale);
      cancelAnimation(light);
      cancelAnimation(blur);
      cancelAnimation(group);
      emitCovered = () => {};
      emitFinished = () => {};
    };

    if (reduced && (beat === 'enter' || beat === 'exit')) {
      group.set(0);
      wash.set(0);
      wash.set(withTiming(1, out(SHOP_DOORWAY_MS.reducedCover), (done) => {
        'worklet';
        if (done) scheduleOnRN(notifyCovered);
      }));
      return stop;
    }

    if (reduced && (beat === 'reveal' || beat === 'exit-reveal')) {
      group.set(0);
      wash.set(1);
      wash.set(withTiming(0, out(SHOP_DOORWAY_MS.reducedReveal), (done) => {
        'worklet';
        if (done) scheduleOnRN(notifyFinished);
      }));
      return stop;
    }

    if (beat === 'enter') {
      flight.set(0);
      doors.set(0);
      push.set(0);
      wash.set(0);
      washScale.set(1);
      light.set(0);
      blur.set(0);
      group.set(1);
      flight.set(withTiming(1, out(SHOP_DOORWAY_MS.card), (done) => {
        'worklet';
        if (!done) return;
        scheduleOnRN(doorsOpened);
        doors.set(withTiming(1, inOut(SHOP_DOORWAY_MS.doors)));
        light.set(withTiming(1, inOut(SHOP_DOORWAY_MS.doors)));
        wash.set(withTiming(0.28, inOut(SHOP_DOORWAY_MS.doors), (doorDone) => {
          'worklet';
          if (!doorDone) return;
          push.set(withTiming(1, inOut(SHOP_DOORWAY_MS.push)));
          wash.set(withTiming(1, inOut(SHOP_DOORWAY_MS.push)));
          blur.set(withTiming(1, inOut(SHOP_DOORWAY_MS.push)));
          group.set(withTiming(0, out(SHOP_DOORWAY_MS.push), (pushDone) => {
            'worklet';
            if (pushDone) scheduleOnRN(notifyCovered);
          }));
        }));
      }));
      return stop;
    }

    if (beat === 'reveal') {
      wash.set(1);
      washScale.set(1.12);
      group.set(0);
      light.set(withTiming(0, out(SHOP_DOORWAY_MS.reveal)));
      blur.set(withTiming(0, out(180)));
      washScale.set(withTiming(0.92, out(SHOP_DOORWAY_MS.reveal)));
      wash.set(withTiming(0, out(SHOP_DOORWAY_MS.reveal), (done) => {
        'worklet';
        if (done) scheduleOnRN(notifyFinished);
      }));
      return stop;
    }

    if (beat === 'exit') {
      flight.set(1);
      doors.set(1);
      push.set(0);
      light.set(1);
      blur.set(0);
      group.set(1);
      wash.set(0);
      washScale.set(1.04);
      doors.set(withTiming(0.05, out(SHOP_DOORWAY_MS.exitCover)));
      light.set(withTiming(0.2, out(SHOP_DOORWAY_MS.exitCover)));
      group.set(withTiming(0, out(SHOP_DOORWAY_MS.exitCover)));
      washScale.set(withTiming(1.16, out(SHOP_DOORWAY_MS.exitCover)));
      wash.set(withTiming(1, out(SHOP_DOORWAY_MS.exitCover), (done) => {
        'worklet';
        if (done) scheduleOnRN(notifyCovered);
      }));
      return stop;
    }

    wash.set(1);
    group.set(0);
    washScale.set(1.08);
    washScale.set(withTiming(1, out(SHOP_DOORWAY_MS.exitReveal)));
    wash.set(withTiming(0, out(SHOP_DOORWAY_MS.exitReveal), (done) => {
      'worklet';
      if (done) scheduleOnRN(notifyFinished);
    }));
    return stop;
    // Origin is fixed for a run. Window size is read from shared values so a
    // rotation mid-cover does not replay the sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, origin, reduced]);

  const placeStyle = useAnimatedStyle(() => {
    const flightP = flight.get();
    const dx = (originX.get() - widthSV.get() / 2) * (1 - flightP);
    const dy = (originY.get() - heightSV.get() / 2) * (1 - flightP);
    return {
      opacity: group.get(),
      transform: [
        { translateX: dx },
        { translateY: dy },
        { rotateZ: `${-12 * (1 - flightP)}deg` },
      ],
    };
  });

  const scaleStyle = useAnimatedStyle(() => {
    const flightP = flight.get();
    const scale = (0.32 + 0.68 * flightP) * (1 + push.get() * 1.85);
    return { transform: [{ scale }] };
  });

  const leftDoorStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1100 },
      { rotateY: `${78 * doors.get()}deg` },
    ],
  }));

  const rightDoorStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1100 },
      { rotateY: `${-78 * doors.get()}deg` },
    ],
  }));

  const lightStyle = useAnimatedStyle(() => ({
    opacity: light.get(),
  }));

  const washStyle = useAnimatedStyle(() => ({
    opacity: wash.get(),
    transform: [{ scale: washScale.get() }],
  }));

  const blurStyle = useAnimatedStyle(() => ({
    opacity: blur.get(),
  }));

  const seamStyle = useAnimatedStyle(() => ({
    opacity: doors.get() * (1 - push.get()) * 0.9,
  }));

  return (
    <View
      style={styles.overlay}
      pointerEvents={beat === 'reveal' || beat === 'exit-reveal' ? 'none' : 'auto'}
      accessibilityViewIsModal
      accessibilityLabel={beat === 'exit' || beat === 'exit-reveal' ? 'Leaving the Royal Shop' : 'Entering the Royal Shop'}
      testID="shop-doorway"
    >
      <Animated.View pointerEvents="none" style={[styles.wash, washStyle]}>
        <LinearGradient
          colors={['#120800', '#6a4010', '#f0c14a', '#fff3c4', '#f0c14a', '#6a4010', '#120800']}
          locations={[0, 0.18, 0.4, 0.5, 0.6, 0.82, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, blurStyle]}>
        <BlurView intensity={18} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.portal,
          {
            width: CARD_W,
            height: CARD_H,
            left: (width - CARD_W) / 2,
            top: (height - CARD_H) / 2,
          },
          placeStyle,
        ]}
      >
        <Animated.View style={[styles.portalInner, scaleStyle]}>
          <Animated.View pointerEvents="none" style={[styles.glow, lightStyle]} />
          <Animated.View pointerEvents="none" style={[styles.glowCyan, lightStyle]} />
          <View style={styles.stage}>
            <Animated.View style={[styles.half, styles.halfLeft, leftDoorStyle]}>
              <View style={styles.clipLeft}>
                <CardBack size="lg" scale={BACK_SCALE} />
              </View>
            </Animated.View>
            <Animated.View style={[styles.half, styles.halfRight, rightDoorStyle]}>
              <View style={styles.clipRight}>
                <View style={styles.rightArt}>
                  <CardBack size="lg" scale={BACK_SCALE} />
                </View>
              </View>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.seam, seamStyle]} />
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    elevation: 80,
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
  },
  portal: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalInner: {
    width: CARD_W,
    height: CARD_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: CARD_W,
    height: CARD_H,
  },
  glow: {
    position: 'absolute',
    width: CARD_W * 1.7,
    height: CARD_H * 1.35,
    borderRadius: 36,
    backgroundColor: '#ffd56a',
    shadowColor: '#f5a623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 48,
  },
  glowCyan: {
    position: 'absolute',
    width: CARD_W * 1.15,
    height: CARD_H * 0.72,
    borderRadius: 28,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00e5ff55',
    shadowColor: '#c084fc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
  },
  half: {
    position: 'absolute',
    top: 0,
    width: HALF,
    height: CARD_H,
    backfaceVisibility: 'hidden',
  },
  halfLeft: {
    left: 0,
    transformOrigin: 'right center',
  },
  halfRight: {
    left: HALF,
    transformOrigin: 'left center',
  },
  clipLeft: {
    width: HALF,
    height: CARD_H,
    overflow: 'hidden',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderRightWidth: 1.5,
    borderColor: '#fbbf24',
    backgroundColor: '#1a0a05',
  },
  clipRight: {
    width: HALF,
    height: CARD_H,
    overflow: 'hidden',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderLeftWidth: 1.5,
    borderColor: '#00e5ff',
    backgroundColor: '#1a0a05',
  },
  rightArt: {
    width: CARD_W,
    marginLeft: -HALF,
  },
  seam: {
    position: 'absolute',
    left: HALF - 1,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 1,
    backgroundColor: '#fff6d0',
    shadowColor: '#fbbf24',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});
