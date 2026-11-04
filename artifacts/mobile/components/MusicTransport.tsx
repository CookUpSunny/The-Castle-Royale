import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMusicPlayer } from '@/contexts/MusicContext';

/**
 * Play, pause, and skip for the song that is on. Shown from the match menu so
 * a catalog stream has the controls App Store Guideline 4.5.2 asks for.
 */
export default function MusicTransport() {
  const { isPlaying, playMusic, pauseMusic, skipMusic } = useMusicPlayer();

  const press = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    action();
  };

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => press(playMusic)}
        style={[styles.button, isPlaying && styles.buttonOn]}
        accessibilityRole="button"
        accessibilityLabel="Play music"
      >
        <Text style={styles.label}>Play</Text>
      </Pressable>
      <Pressable
        onPress={() => press(pauseMusic)}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Pause music"
      >
        <Text style={styles.label}>Pause</Text>
      </Pressable>
      <Pressable
        onPress={() => press(skipMusic)}
        style={styles.button}
        accessibilityRole="button"
        accessibilityLabel="Skip song"
      >
        <Text style={styles.label}>Skip</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  button: {
    minWidth: 52,
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5b1a8c',
    backgroundColor: '#12042a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonOn: {
    borderColor: '#ffd700',
    backgroundColor: '#3b1759',
  },
  label: {
    color: '#e0c8ff',
    fontSize: 12,
    fontWeight: '800',
  },
});
