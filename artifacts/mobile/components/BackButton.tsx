import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface BackButtonProps {
  label?: string;
  onPress: () => void;
}

export default function BackButton({ label = '← BACK', onPress }: BackButtonProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
    >
      <Text style={[styles.text, { color: colors.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingRight: 16,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
