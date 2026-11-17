import React from 'react';
import { StyleSheet, Text, type TextStyle, type ViewStyle } from 'react-native';
import PressableScale from '@/components/PressableScale';
import { useColors } from '@/hooks/useColors';

interface BackButtonProps {
  label?: string;
  onPress: () => void;
  style?: ViewStyle;
  labelStyle?: TextStyle;
}

export default function BackButton({ label = '← BACK', onPress, style, labelStyle }: BackButtonProps) {
  const colors = useColors();
  return (
    <PressableScale onPress={onPress} style={[styles.btn, style]}>
      <Text style={[styles.text, { color: colors.mutedForeground }, labelStyle]}>{label}</Text>
    </PressableScale>
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
