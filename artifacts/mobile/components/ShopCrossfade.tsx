import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * One opacity crossfade for a shop swap. Header chrome stays outside.
 * The first view is already there. Later views fade. Opacity only.
 */

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

let crossfadeSerial = 0;
const retireHandlers = new Map<number, (key: string) => void>();

function retireLayer(id: number, key: string) {
  retireHandlers.get(id)?.(key);
}

function FadeLayer({
  active,
  animateIn,
  fill,
  grow,
  center,
  duration,
  crossfadeId,
  layerKey,
  children,
}: {
  active: boolean;
  animateIn: boolean;
  fill: boolean;
  grow: boolean;
  center: boolean;
  duration: number;
  crossfadeId: number;
  layerKey: string;
  children: React.ReactNode;
}) {
  const animateInRef = useRef(animateIn);
  const opacity = useSharedValue(animateIn ? 0 : 1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  useEffect(() => {
    const timing = {
      duration: active ? duration : Math.max(140, duration - 20),
      easing: EASE_OUT,
      reduceMotion: ReduceMotion.Never,
    };
    if (active) {
      if (animateInRef.current) {
        animateInRef.current = false;
        opacity.set(withTiming(1, timing));
      }
      return () => cancelAnimation(opacity);
    }
    opacity.set(withTiming(0, timing, (finished) => {
      'worklet';
      if (finished) scheduleOnRN(retireLayer, crossfadeId, layerKey);
    }));
    return () => cancelAnimation(opacity);
  }, [active, crossfadeId, duration, layerKey, opacity]);

  const position = fill || !active ? StyleSheet.absoluteFill : grow && active ? styles.grow : null;
  return (
    <Animated.View
      pointerEvents={active ? 'box-none' : 'none'}
      style={[position, !fill && !active && center ? styles.center : null, style]}
    >
      {children}
    </Animated.View>
  );
}

export default function ShopCrossfade({
  swapKey,
  duration,
  fill = false,
  grow = false,
  center = false,
  style,
  pointerEvents = 'box-none',
  children,
}: {
  swapKey: string;
  duration: number;
  /** Cover the parent. The parent must already have a size. */
  fill?: boolean;
  /** Active layer fills a flex parent. Outgoing layers stay absolutely over it. */
  grow?: boolean;
  /** Center an outgoing hug layer over the incoming one. */
  center?: boolean;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'box-none' | 'none' | 'auto';
  children: React.ReactNode;
}) {
  const idRef = useRef(0);
  if (idRef.current === 0) {
    crossfadeSerial += 1;
    idRef.current = crossfadeSerial;
  }
  const cache = useRef(new Map<string, React.ReactNode>());
  const born = useRef(false);
  const [keys, setKeys] = useState<string[]>([swapKey]);

  if (keys[0] !== swapKey) {
    const next = [swapKey, keys[0]].filter((key, index, all) => all.indexOf(key) === index);
    setKeys(next.slice(0, 2));
  }
  cache.current.set(swapKey, children);

  useEffect(() => {
    const id = idRef.current;
    retireHandlers.set(id, (key) => {
      setKeys((current) => (current[0] === key ? current : current.filter((item) => item !== key)));
    });
    born.current = true;
    return () => {
      retireHandlers.delete(id);
    };
  }, []);

  const ordered = [...keys.filter((key) => key !== swapKey), swapKey];

  return (
    <View style={style} pointerEvents={pointerEvents}>
      {ordered.map((key) => (
        <FadeLayer
          key={key}
          active={key === swapKey}
          animateIn={born.current}
          fill={fill}
          grow={grow}
          center={center}
          duration={duration}
          crossfadeId={idRef.current}
          layerKey={key}
        >
          {key === swapKey ? children : cache.current.get(key)}
        </FadeLayer>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
  },
});
