import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Full-scene character plate for the match corner.
 * `contain` keeps the whole picture. Opacity stays high so it reads sharp.
 */
export function CharacterScenePlate({
  source,
  width,
  height,
  opacity,
  name,
  onPress,
}: {
  source: number | null;
  width: number;
  height: number;
  opacity: number;
  name?: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={{ width, opacity }} pointerEvents="none">
      {source ? (
        <Image
          source={source}
          style={{ width, height }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={{ width, height }} />
      )}
      {name ? (
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      ) : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  name: {
    marginTop: 2,
    color: '#ffd700',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
