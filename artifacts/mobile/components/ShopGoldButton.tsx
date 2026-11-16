import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

/**
 * The shop's one button. Buy, Select, Equip, Equipped, and Coming soon all
 * use this gold pill so the arenas, the card pack, and memberships match.
 */
export default function ShopGoldButton({
  label,
  onPress,
  disabled,
  testID = 'shop-action',
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [pressed && !disabled && { opacity: 0.88 }]}
    >
      <LinearGradient
        colors={['#f8e7a2', '#e0b03a', '#f3d36a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 220,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    shadowColor: '#f0d78c',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    color: '#1a1004',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
});
