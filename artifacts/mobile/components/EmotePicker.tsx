import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

const EMOJIS = ['👋', '🔥', '😎', '🎉', '🤝', '👑', '⚡', '💀'];
const TAUNTS = ['GG!', 'NICE!', 'LUCKY!', 'OOF!'];

interface EmotePickerProps {
  onSend: (emote: string) => void;
}

/**
 * Bottom-left quick-emote dock. The 💬 button opens a phrase row, the 😊
 * button opens an emoji grid. Tapping any item fires onSend (which the
 * parent forwards to the server) and immediately collapses the panel.
 *
 * A 1.5s soft cooldown matches the server-side throttle so the buttons
 * don't feel ignored when the user spams them.
 */
export default function EmotePicker({ onSend }: EmotePickerProps) {
  const colors = useColors();
  const [open, setOpen] = useState<'emoji' | 'phrase' | null>(null);
  const [lastSentAt, setLastSentAt] = useState(0);

  const panelOpacity = useSharedValue(0);
  const panelTranslate = useSharedValue(8);

  React.useEffect(() => {
    if (open) {
      panelOpacity.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
      panelTranslate.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.cubic) });
    } else {
      panelOpacity.value = withTiming(0, { duration: 120 });
      panelTranslate.value = withTiming(8, { duration: 120 });
    }
  }, [open, panelOpacity, panelTranslate]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelTranslate.value }],
  }));

  const handlePick = (item: string) => {
    const now = Date.now();
    if (now - lastSentAt < 1500) {
      // Soft client-side cooldown — match server throttle.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    setLastSentAt(now);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSend(item);
    setOpen(null);
  };

  const toggle = (which: 'emoji' | 'phrase') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setOpen((prev) => (prev === which ? null : which));
  };

  // Render the popup panel above the buttons. Pointer events disabled when
  // closed so taps fall through to the table.
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {open ? (
        <Animated.View
          style={[
            styles.panel,
            { backgroundColor: '#1a0535f0', borderColor: colors.neonPurple, shadowColor: colors.neonPurple },
            panelStyle,
          ]}
          pointerEvents="auto"
        >
          {open === 'emoji' ? (
            <View style={styles.emojiGrid}>
              {EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => handlePick(e)}
                  style={({ pressed }) => [styles.emojiBtn, pressed && { opacity: 0.6, transform: [{ scale: 0.92 }] }]}
                  hitSlop={4}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.phraseCol}>
              {TAUNTS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => handlePick(t)}
                  style={({ pressed }) => [
                    styles.phraseBtn,
                    { borderColor: colors.neonGold },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[styles.phraseText, { color: colors.neonGold }]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => toggle('phrase')}
          style={[
            styles.chatBtn,
            { borderColor: open === 'phrase' ? colors.neonGold : '#3a1a5e' },
          ]}
        >
          <Text style={styles.chatIcon}>💬</Text>
        </Pressable>
        <Pressable
          onPress={() => toggle('emoji')}
          style={[
            styles.chatBtn,
            { borderColor: open === 'emoji' ? colors.neonGold : '#3a1a5e' },
          ]}
        >
          <Text style={styles.chatIcon}>😊</Text>
        </Pressable>
      </View>

      {/* Tap-anywhere backdrop to dismiss the panel. Only mounted when open. */}
      {open ? (
        <Pressable
          onPress={() => setOpen(null)}
          style={styles.backdrop}
          pointerEvents="auto"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    // Container sits in the bottom-right corner, clear of the left avatar.
    position: 'absolute',
    right: 12,
    bottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 2,
  },
  chatBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    backgroundColor: '#10002890',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatIcon: {
    fontSize: 16,
  },
  panel: {
    position: 'absolute',
    bottom: 44,
    right: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 8,
    paddingHorizontal: 8,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 18,
    zIndex: 3,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(8px)' as unknown as undefined } : {}),
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 168,
    gap: 4,
  },
  emojiBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emojiText: {
    fontSize: 24,
  },
  phraseCol: {
    gap: 4,
    minWidth: 120,
  },
  phraseBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1.2,
    backgroundColor: '#10002850',
    alignItems: 'center',
  },
  phraseText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  backdrop: {
    position: 'absolute',
    left: -2000,
    right: -2000,
    top: -2000,
    bottom: -2000,
    zIndex: 1,
  },
});
