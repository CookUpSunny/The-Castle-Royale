import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SHOP_BACK_VARIANT, type ShopBackVariant } from '@/lib/royalShop';

/**
 * The shop's back control. Same pill size as Restore: 40pt, radius 20.
 * `SHOP_BACK_VARIANT` picks the style. Gold is the default.
 * Emerald is the bright alternate.
 */
export default function ShopBackButton({
  onPress,
  variant = SHOP_BACK_VARIANT,
}: {
  onPress: () => void;
  variant?: ShopBackVariant;
}) {
  const emerald = variant === 'emerald';
  return (
    <Pressable
      testID={emerald ? 'shop-back-emerald' : 'shop-back'}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={8}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {emerald ? (
        <LinearGradient
          colors={['#e7ffe8', '#3dff9a', '#14c56e']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.pill, styles.emerald]}
        >
          <Text style={styles.emeraldLabel}>← BACK</Text>
        </LinearGradient>
      ) : (
        <View style={[styles.pill, styles.gold]}>
          <Text style={styles.goldLabel}>← BACK</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gold: {
    backgroundColor: '#07000c',
    borderWidth: 1.5,
    borderColor: '#f0d78c',
    shadowColor: '#f0d78c',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  goldLabel: {
    color: '#f8e7a2',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  emerald: {
    shadowColor: '#39ff9a',
    shadowOpacity: 0.9,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  emeraldLabel: {
    color: '#04140c',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pressed: {
    opacity: 0.88,
  },
});
