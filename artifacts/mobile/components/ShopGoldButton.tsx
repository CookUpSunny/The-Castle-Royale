import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import PressableScale from '@/components/PressableScale';

/**
 * The shop's one button. Buy, Select, Equip, Equipped, and Coming soon all
 * use this gold pill so the arenas, the card pack, and memberships match.
 */
export default function ShopGoldButton({
  label,
  onPress,
  disabled,
  testID = 'shop-action',
  compact = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  /** Corner actions (Restore, Close) use the home-screen gold pill. */
  compact?: boolean;
}) {
  return (
    <PressableScale
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={compact ? ['#f5e070', '#d4a820', '#f5e070'] : ['#f8e7a2', '#e0b03a', '#f3d36a']}
        start={compact ? { x: 0, y: 0 } : { x: 0, y: 0 }}
        end={compact ? { x: 1, y: 0 } : { x: 1, y: 1 }}
        style={compact ? styles.compact : styles.button}
      >
        <Text style={compact ? styles.compactLabel : styles.label}>{label}</Text>
      </LinearGradient>
    </PressableScale>
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
  compact: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d4a820',
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  compactLabel: {
    color: '#1a0e00',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
