import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { PLAYER_MENU_HIT, togglePlayerMenu } from '@/lib/characterSceneLayout';

const PRESS = { damping: 16, stiffness: 420 };
const REBOUND = { damping: 9, stiffness: 260 };

/** Royal 3D control that opens the name and sound menu. */
export function PlayerMenuButton({
  open,
  onChange,
  style,
}: {
  open: boolean;
  onChange: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);
  const drop = useSharedValue(0);
  const shade = useSharedValue(14);

  const face = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }, { scale: scale.value }],
    shadowRadius: shade.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Player menu"
      onPressIn={() => {
        scale.value = withSpring(0.9, PRESS);
        drop.value = withSpring(3, PRESS);
        shade.value = withSpring(4, PRESS);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, REBOUND);
        drop.value = withSpring(0, REBOUND);
        shade.value = withSpring(14, REBOUND);
      }}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onChange(togglePlayerMenu(open));
      }}
      style={style}
    >
      <Animated.View style={[styles.hit, { borderColor: colors.neonGold, shadowColor: colors.neonPurple }, face]}>
        <LinearGradient
          colors={['#6a4a12', '#2a1048', '#071820']}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(255,236,170,0.72)', 'rgba(255,255,255,0.08)', 'transparent']}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 0.7 }}
          style={styles.highlight}
        />
        <View style={styles.rim} />
        <Text style={[styles.star, { color: colors.neonGold }]}>✦</Text>
        <Text style={styles.dots}>⋯</Text>
        <Text style={[styles.star, { color: colors.electric }]}>✦</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Frosted panel for the existing name, sound, music, and exit actions. */
export function PlayerMenuGlass({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [plain, setPlain] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const slide = useSharedValue(16);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setPlain).catch(() => setPlain(false));
  }, []);

  useEffect(() => {
    if (plain) {
      opacity.value = withTiming(1, { duration: 160 });
      scale.value = 1;
      slide.value = 0;
      return;
    }
    opacity.value = withSpring(1, { damping: 16, stiffness: 180 });
    scale.value = withSpring(1, { damping: 11, stiffness: 210 });
    slide.value = withSpring(0, { damping: 13, stiffness: 190 });
  }, [opacity, plain, scale, slide]);

  const motion = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: slide.value }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.glass, style, motion]}>
      <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,215,0,0.08)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.8, y: 0.55 }}
        style={styles.sheen}
        pointerEvents="none"
      />
      <View style={styles.goldLine} pointerEvents="none" />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: PLAYER_MENU_HIT,
    height: PLAYER_MENU_HIT,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: '#1a0535',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.85,
    elevation: 10,
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
  },
  rim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,236,170,0.55)',
    margin: 3,
  },
  star: {
    fontSize: 9,
    fontWeight: '900',
  },
  dots: {
    fontSize: 18,
    fontWeight: '900',
    color: '#e0c8ff',
    lineHeight: 20,
    marginTop: -4,
  },
  glass: {
    position: 'absolute',
    minWidth: 176,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.45)',
    backgroundColor: 'rgba(16,4,32,0.45)',
    paddingVertical: 6,
    zIndex: 60,
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 28,
  },
  goldLine: {
    position: 'absolute',
    top: 0,
    left: 14,
    right: 14,
    height: 1,
    backgroundColor: 'rgba(255,215,0,0.7)',
  },
});
