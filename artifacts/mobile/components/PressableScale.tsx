import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { PRESS_EASING, PRESS_MS, PRESS_OPACITY, PRESS_SCALE } from '@/lib/pressFeedback';

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
  const [pressed, setPressed] = useState(false);
  const down = pressed && !disabled;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      hitSlop={hitSlop}
      pressRetentionOffset={pressRetentionOffset}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[
        style as StyleProp<ViewStyle>,
        {
          transitionProperty: 'transform',
          transitionDuration: `${PRESS_MS}ms`,
          transitionTimingFunction: PRESS_EASING,
          transform: [{ scale: down ? PRESS_SCALE : 1 }],
          opacity: down ? PRESS_OPACITY : undefined,
        },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}
