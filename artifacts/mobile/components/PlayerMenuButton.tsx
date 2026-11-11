import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { PLAYER_MENU_HIT, togglePlayerMenu } from '@/lib/characterSceneLayout';

/** Small royal control that opens the existing name and sound menu. */
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Player menu"
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onChange(togglePlayerMenu(open));
      }}
      style={[
        styles.hit,
        {
          borderColor: colors.neonGold,
          shadowColor: colors.neonPurple,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={['#3a1a05f0', '#1a0535f5', '#0a2030f0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={[styles.star, { color: colors.neonGold }]}>✦</Text>
      <Text style={styles.dots}>⋯</Text>
      <Text style={[styles.star, { color: colors.electric }]}>✦</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: PLAYER_MENU_HIT,
    height: PLAYER_MENU_HIT,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: '#1a0535',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
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
});
