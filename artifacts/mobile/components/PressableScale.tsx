import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PRESS_MS, PRESS_OPACITY, PRESS_RELEASE_MS, PRESS_SCALE } from '@/lib/pressFeedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Shared press. Scale 0.97 over 120ms on the ease-out curve, plus a slight dim.
 * Gold pill styles stay on `style`.
 */
export default function PressableScale({
  children,
  style,
  disabled,
  hitSlop = 12,
  pressRetentionOffset = 16,
  onPressIn,
  onPressOut,
  ...rest
}: PressableProps) {
  const scale = useSharedValue(1);
  const held = useSharedValue(false);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: held.value ? PRESS_OPACITY : undefined,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop}
      pressRetentionOffset={pressRetentionOffset}
      onPressIn={(event) => {
        if (!disabled) {
          held.value = true;
          scale.value = withTiming(PRESS_SCALE, {
            duration: PRESS_MS,
            easing: Easing.bezier(0.23, 1, 0.32, 1),
          });
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        held.value = false;
        scale.value = withTiming(1, {
          duration: PRESS_RELEASE_MS,
          easing: Easing.bezier(0.23, 1, 0.32, 1),
        });
        onPressOut?.(event);
      }}
      style={[style as StyleProp<ViewStyle>, animStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
