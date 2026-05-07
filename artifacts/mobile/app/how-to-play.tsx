import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import BackButton from '@/components/BackButton';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'OBJECTIVE',
    body: 'Be the first to play all your cards — hand, face-up, and face-down. The last player still holding cards is the Castle Royale loser.',
  },
  {
    title: 'YOUR THREE ZONES',
    body: '• HAND (3 cards) — only you can see them.\n• FACE-UP (3 cards) — visible to everyone, played after your hand is empty.\n• FACE-DOWN (3 cards) — hidden to everyone (even you), played last. Each is a coin flip.',
  },
  {
    title: 'TURN BASICS',
    body: 'On your turn play a card equal to or higher than the top of the discard pile. Then draw back up to 3 cards from the deck (until it runs out). If you cannot play, you must pick up the entire pile.',
  },
  {
    title: 'POWER CARDS',
    body: '• 2 — RESET. Plays on anything; the pile resets to value 2 (anything goes next).\n• 10 — BURN. Plays on anything; the entire pile is destroyed and you go again.\n• 4-of-a-kind — BURN. If the top four cards on the pile share a value, the pile is destroyed and you go again.',
  },
  {
    title: 'FACE-UP & FACE-DOWN',
    body: 'When your hand is empty (and the deck is empty) you play your face-up cards. When those are gone, you play face-down — sight unseen. If a face-down card cannot be played, you take the whole pile back into your hand.',
  },
  {
    title: 'WINNING',
    body: 'Empty your hand, then your face-up, then your face-down — in that order. The first player to play their last card wins the round.',
  },
];

export default function HowToPlayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const webTopPad = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={['#200040', '#0a0018', '#07000f']}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.headerWrap, { paddingTop: insets.top + webTopPad + 12 }]}>
        <View style={styles.headerRow}>
          <BackButton label="← BACK" onPress={() => router.back()} />
          <View style={{ flex: 1 }} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>HOW TO</Text>
        <Text style={[styles.titleSub, { color: colors.neonGold }]}>PLAY</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.neonGold }]}>✦  {s.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.foreground }]}>{s.body}</Text>
          </View>
        ))}

        <View style={[styles.tipBox, { borderColor: colors.neonGold }]}>
          <Text style={[styles.tipTitle, { color: colors.neonGold }]}>TIP</Text>
          <Text style={[styles.tipBody, { color: colors.mutedForeground }]}>
            Save your 2s and 10s for tight spots. A well-timed BURN can swing the entire match.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: 24, paddingBottom: 14 },
  headerRow: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 38, fontWeight: '900', letterSpacing: 8, textAlign: 'center' },
  titleSub: { fontSize: 18, fontWeight: '700', letterSpacing: 6, marginTop: -4, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  section: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
  },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  sectionBody: { fontSize: 14, lineHeight: 22, letterSpacing: 0.3 },
  tipBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    backgroundColor: 'rgba(255,215,0,0.06)',
  },
  tipTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 4, marginBottom: 6 },
  tipBody: { fontSize: 13, lineHeight: 19, letterSpacing: 0.3 },
});
