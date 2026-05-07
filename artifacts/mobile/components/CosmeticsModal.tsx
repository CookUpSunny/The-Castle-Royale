import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardBack } from '@/components/Card';
import ArenaBackground from '@/components/ArenaBackground';
import {
  ARENAS,
  CARD_SKINS,
  type Arena,
  type ArenaId,
  type CardSkin,
  type CardSkinId,
  useCosmetics,
} from '@/contexts/CosmeticsContext';
import { useGame, type ActiveGame } from '@/contexts/GameContext';
import { useColors } from '@/hooks/useColors';

/**
 * Toggle to `true` locally to preview the spectate feature without
 * needing a real premium account. Set back to `false` before shipping.
 */
const DEV_PREMIUM = false;

interface CosmeticsModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Full-screen cosmetics picker with three tabs: ARENAS, CARDS, and SPECTATE.
 * The SPECTATE tab is premium-gated — set DEV_PREMIUM = true to test it locally.
 */
export default function CosmeticsModal({ visible, onClose }: CosmeticsModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cardSkin, arena, setCardSkin, setArena } = useCosmetics();
  const { activeGames, spectateGame, refreshActiveGames } = useGame();
  const [tab, setTab] = useState<'arenas' | 'cards' | 'spectate'>('arenas');

  // Refresh the game list when spectate tab opens, then every 5 s while active.
  useEffect(() => {
    if (tab !== 'spectate') return;
    refreshActiveGames();
    const interval = setInterval(() => {
      refreshActiveGames();
    }, 5000);
    return () => clearInterval(interval);
  }, [tab, refreshActiveGames]);

  const pickArena = (id: ArenaId) => {
    Haptics.selectionAsync().catch(() => {});
    setArena(id);
  };
  const pickCard = (skin: CardSkin) => {
    if (!skin.unlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setCardSkin(skin.id);
  };

  const handleSpectate = (game: ActiveGame) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    spectateGame(game.gameId);
    onClose();
    router.push('/spectate');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen" transparent>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ArenaBackground arenaOverride="cosmic" />
        </View>

        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerKicker, { color: colors.neonPurple }]}>✦  STORE  ✦</Text>
            <Text style={[styles.headerTitle, { color: colors.neonGold }]}>COSMETICS</Text>
          </View>
          <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: colors.neonPurple }]}>
            <Text style={[styles.closeText, { color: colors.neonGold }]}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <TabButton label="ARENAS" active={tab === 'arenas'} onPress={() => setTab('arenas')} />
          <TabButton label="CARDS" active={tab === 'cards'} onPress={() => setTab('cards')} />
          <TabButton label="SPECTATE" active={tab === 'spectate'} onPress={() => setTab('spectate')} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {tab === 'arenas' &&
            ARENAS.map((a: Arena) => (
              <CosmeticRow
                key={a.id}
                name={a.name}
                description={a.description}
                badge={a.premium ? 'premium' : null}
                locked={false}
                selected={arena === a.id}
                onPress={() => pickArena(a.id)}
                preview={<ArenaPreview arenaId={a.id} />}
              />
            ))}

          {tab === 'cards' &&
            CARD_SKINS.map((c: CardSkin) => (
              <CosmeticRow
                key={c.id}
                name={c.name}
                description={c.description}
                badge={c.unlocked ? 'premium' : 'locked'}
                locked={!c.unlocked}
                selected={cardSkin === c.id}
                onPress={() => pickCard(c)}
                preview={<CardSkinPreview cardSkinId={c.id} />}
              />
            ))}

          {tab === 'spectate' && (
            DEV_PREMIUM ? (
              <SpectateContent
                games={activeGames}
                onSpectate={handleSpectate}
                onRefresh={refreshActiveGames}
              />
            ) : (
              <PremiumGate colors={colors} />
            )
          )}

          {tab !== 'spectate' && (
            <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
              🔒 Locked decks unlock with the upcoming premium tier — full purchase flow coming soon.
            </Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPECTATE tab content
// ─────────────────────────────────────────────────────────────────────────────

function PremiumGate({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.premiumGateWrap}>
      <Text style={styles.premiumGateIcon}>🔒</Text>
      <Text style={[styles.premiumGateTitle, { color: colors.neonGold }]}>PREMIUM FEATURE</Text>
      <Text style={[styles.premiumGateDesc, { color: colors.mutedForeground }]}>
        Upgrade to Castle Royale Premium to watch live PvP matches in real time with an orbit camera view.
      </Text>
      <View style={[styles.premiumBadge, { borderColor: colors.neonGold, marginTop: 12 }]}>
        <Text style={[styles.premiumText, { color: colors.neonGold }]}>👑 COMING SOON</Text>
      </View>
    </View>
  );
}

function SpectateContent({
  games,
  onSpectate,
  onRefresh,
}: {
  games: ActiveGame[];
  onSpectate: (game: ActiveGame) => void;
  onRefresh: () => void;
}) {
  const colors = useColors();

  if (games.length === 0) {
    return (
      <View style={styles.noGamesWrap}>
        <Text style={styles.noGamesIcon}>🎴</Text>
        <Text style={[styles.noGamesText, { color: colors.mutedForeground }]}>
          No live PvP matches right now
        </Text>
        <Pressable
          onPress={onRefresh}
          style={[styles.refreshBtn, { borderColor: colors.neonPurple }]}
        >
          <Text style={[styles.refreshText, { color: colors.neonPurple }]}>↻ Refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <View style={styles.spectateHeader}>
        <Text style={[styles.spectateHeaderText, { color: colors.mutedForeground }]}>
          {games.length} live {games.length === 1 ? 'match' : 'matches'}
        </Text>
        <Pressable onPress={onRefresh}>
          <Text style={[styles.refreshText, { color: colors.neonPurple }]}>↻ Refresh</Text>
        </Pressable>
      </View>
      {games.map((game) => (
        <Pressable
          key={game.gameId}
          style={({ pressed }) => [
            styles.gameRow,
            { borderColor: '#3a1a5e', backgroundColor: '#1a053590' },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => onSpectate(game)}
        >
          <View style={styles.gameRowLeft}>
            <Text style={[styles.gameVsText, { color: colors.foreground }]} numberOfLines={1}>
              {game.player1Name} <Text style={{ color: colors.neonPurple }}>VS</Text>{' '}
              {game.player2Name}
            </Text>
            <Text style={[styles.gameMetaText, { color: colors.mutedForeground }]}>
              👁 {game.spectatorCount} watching · 🃏 {game.turnCount} plays
            </Text>
          </View>
          <Text style={[styles.watchBtn, { color: colors.neonGold }]}>WATCH →</Text>
        </Pressable>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabBtn,
        {
          borderColor: active ? colors.neonGold : '#3a1a5e',
          backgroundColor: active ? '#3a1a5e60' : 'transparent',
        },
      ]}
    >
      <Text style={[styles.tabText, { color: active ? colors.neonGold : colors.mutedForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

interface CosmeticRowProps {
  name: string;
  description: string;
  badge: 'premium' | 'locked' | null;
  locked: boolean;
  selected: boolean;
  onPress: () => void;
  preview: React.ReactNode;
}

function CosmeticRow({ name, description, badge, locked, selected, onPress, preview }: CosmeticRowProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.itemRow,
        {
          borderColor: selected ? colors.neonGold : '#3a1a5e',
          backgroundColor: selected ? '#3a1a5e80' : '#1a053590',
        },
        locked && { opacity: 0.6 },
        pressed && !locked && { opacity: 0.85 },
      ]}
    >
      <View style={styles.itemPreview}>
        {preview}
        {locked ? (
          <View style={styles.lockOverlay} pointerEvents="none">
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.itemMeta}>
        <View style={styles.itemNameRow}>
          <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={1}>
            {name}
          </Text>
          {badge === 'premium' ? (
            <View style={[styles.premiumBadge, { borderColor: colors.neonGold }]}>
              <Text style={[styles.premiumText, { color: colors.neonGold }]}>👑 PREMIUM</Text>
            </View>
          ) : null}
          {badge === 'locked' ? (
            <View style={[styles.premiumBadge, { borderColor: '#94a3b8', backgroundColor: '#1e293b80' }]}>
              <Text style={[styles.premiumText, { color: '#cbd5e1' }]}>🔒 COMING SOON</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
          {description}
        </Text>
        <View style={styles.statusRow}>
          {selected ? (
            <Text style={[styles.equippedText, { color: colors.neonGold }]}>✓ EQUIPPED</Text>
          ) : locked ? (
            <Text style={[styles.tapToEquip, { color: '#94a3b8' }]}>Locked</Text>
          ) : (
            <Text style={[styles.tapToEquip, { color: colors.mutedForeground }]}>Tap to equip</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function ArenaPreview({ arenaId }: { arenaId: ArenaId }) {
  return (
    <View style={styles.arenaPreviewBox}>
      <ArenaBackground arenaOverride={arenaId} />
    </View>
  );
}

function CardSkinPreview({ cardSkinId }: { cardSkinId: CardSkinId }) {
  return (
    <View style={styles.cardPreviewBox}>
      <CardBack size="md" skinOverride={cardSkinId} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#07000f',
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  headerKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: '#fbbf24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    backgroundColor: '#1a0535aa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 18,
    fontWeight: '900',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  scrollBody: {
    paddingBottom: 24,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    alignItems: 'center',
    gap: 12,
  },
  itemPreview: {
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#07000f',
    borderWidth: 1,
    borderColor: '#3a1a5e',
  },
  arenaPreviewBox: {
    width: '100%',
    height: '100%',
  },
  cardPreviewBox: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,0,15,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    fontSize: 28,
  },
  itemMeta: {
    flex: 1,
    gap: 4,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  premiumBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#3a1a5e60',
  },
  premiumText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  itemDesc: {
    fontSize: 11,
    lineHeight: 14,
  },
  statusRow: {
    marginTop: 2,
  },
  equippedText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  tapToEquip: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  footnote: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  premiumGateWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 12,
  },
  premiumGateIcon: { fontSize: 52 },
  premiumGateTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
  },
  premiumGateDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  noGamesWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  noGamesIcon: { fontSize: 40 },
  noGamesText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  refreshBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    marginTop: 4,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  spectateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  spectateHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 10,
  },
  gameRowLeft: {
    flex: 1,
    gap: 4,
  },
  gameVsText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  gameMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  watchBtn: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});

void LinearGradient;
