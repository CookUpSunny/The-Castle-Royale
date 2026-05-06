import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface AvatarPlayPulseProps {
  /** Increment to fire a one-shot scale pulse (e.g. tied to a card play). */
  trigger: number;
  /**
   * Increment to fire a celebratory vertical bounce (e.g. tied to a deck
   * burn / 4-of-a-kind set complete). Three diminishing hops with an
   * out-quad ascent and out-bounce descent — synced visually with the
   * burn haptic + screen-shake the parent fires at the same time.
   */
  bounceTrigger?: number;
  /**
   * Increment to fire a longer "castle reached" celebration: a taller
   * sustained bounce + a multi-second gold halo glow that radiates
   * around the avatar. Used when the player drains a castle layer
   * (hand → top, face-up → bottom).
   */
  castleTrigger?: number;
  /** Color of the castle glow halo. Defaults to gold. */
  glowColor?: string;
  style?: object;
  children: React.ReactNode;
}

/**
 * Avatar reaction layer:
 *   - `trigger`        → brief scale punch when a card leaves the zone
 *   - `bounceTrigger`  → 3-hop vertical bounce when the player burns the deck
 *   - `castleTrigger`  → taller multi-bounce + glowing gold halo when the
 *                        player clears a castle layer
 *
 * Animations compose cleanly via shared-value transforms, so a play
 * that *also* triggers a burn or castle (the burn card's animation)
 * plays the punch AND the bounce simultaneously without fighting each
 * other. The halo lives on a sibling layer so it does not affect the
 * underlying avatar's bounding box.
 */
export default function AvatarPlayPulse({
  trigger,
  bounceTrigger,
  castleTrigger,
  glowColor = '#ffd700',
  style,
  children,
}: AvatarPlayPulseProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const haloScale = useSharedValue(0.6);
  const haloOpacity = useSharedValue(0);
  const halo2Scale = useSharedValue(0.4);
  const halo2Opacity = useSharedValue(0);

  useEffect(() => {
    if (!trigger) return;
    scale.value = 1;
    scale.value = withSequence(
      withTiming(1.07, { duration: 100, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
    );
  }, [trigger, scale]);

  useEffect(() => {
    if (!bounceTrigger) return;
    translateY.value = 0;
    translateY.value = withSequence(
      withTiming(-22, { duration: 130, easing: Easing.out(Easing.quad) }),
      withTiming(0,   { duration: 150, easing: Easing.out(Easing.bounce) }),
      withTiming(-14, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0,   { duration: 130, easing: Easing.out(Easing.bounce) }),
      withTiming(-7,  { duration: 90,  easing: Easing.out(Easing.quad) }),
      withTiming(0,   { duration: 110, easing: Easing.out(Easing.bounce) }),
    );
  }, [bounceTrigger, translateY]);

  // Castle-reached: same diminishing-hop pattern but taller / longer,
  // + a gold halo that pulses outward twice while the avatar bounces.
  useEffect(() => {
    if (!castleTrigger) return;

    translateY.value = 0;
    translateY.value = withSequence(
      withTiming(-34, { duration: 170, easing: Easing.out(Easing.quad) }),
      withTiming(0,   { duration: 180, easing: Easing.out(Easing.bounce) }),
      withTiming(-22, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(0,   { duration: 160, easing: Easing.out(Easing.bounce) }),
      withTiming(-12, { duration: 110, easing: Easing.out(Easing.quad) }),
      withTiming(0,   { duration: 130, easing: Easing.out(Easing.bounce) }),
    );

    scale.value = withSequence(
      withTiming(1.12, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }),
    );

    // Two concentric halos: tight + bright on first beat, then a slower
    // wider one for the sustained "I just hit a milestone" glow.
    haloOpacity.value = 0;
    haloScale.value = 0.5;
    haloOpacity.value = withSequence(
      withTiming(1, { duration: 140, easing: Easing.out(Easing.cubic) }),
      withDelay(900, withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) })),
    );
    haloScale.value = withSequence(
      withTiming(1.1, { duration: 280, easing: Easing.out(Easing.cubic) }),
      withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.cubic) }),
    );

    halo2Opacity.value = 0;
    halo2Scale.value = 0.6;
    halo2Opacity.value = withDelay(
      120,
      withSequence(
        withTiming(0.55, { duration: 220 }),
        withDelay(800, withTiming(0, { duration: 700 })),
      ),
    );
    halo2Scale.value = withDelay(
      120,
      withTiming(1.55, { duration: 1500, easing: Easing.out(Easing.cubic) }),
    );
  }, [castleTrigger, translateY, scale, haloScale, haloOpacity, halo2Scale, halo2Opacity]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));
  const halo2Style = useAnimatedStyle(() => ({
    opacity: halo2Opacity.value,
    transform: [{ scale: halo2Scale.value }],
  }));

  return (
    <View style={[style, { position: 'relative' }]}>
      <Animated.View style={[styles.halo, halo2Style, { borderColor: glowColor, shadowColor: glowColor }]} pointerEvents="none" />
      <Animated.View style={[styles.halo, styles.haloInner, haloStyle, { borderColor: glowColor, shadowColor: glowColor }]} pointerEvents="none" />
      <Animated.View style={anim}>{children}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    position: 'absolute',
    top: '5%',
    left: '5%',
    right: '5%',
    bottom: '5%',
    borderRadius: 999,
    borderWidth: 2,
    shadowOpacity: 0.95,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  haloInner: {
    borderWidth: 3,
  },
});
