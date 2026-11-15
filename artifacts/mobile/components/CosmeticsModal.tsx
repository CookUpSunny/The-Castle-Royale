import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardBack } from '@/components/Card';
import ArenaBackground from '@/components/ArenaBackground';
import PaywallModal from '@/components/PaywallModal';
import {
  ARENAS,
  CARD_SKINS,
  type Arena,
  type ArenaId,
  type CardSkin,
  type CardSkinId,
  useCosmetics,
} from '@/contexts/CosmeticsContext';
import { isRetiredBasicSkin } from '@/lib/cardSkins';
import {
  GRANDSCAPE_MIRROR_PACK,
  GRANDSCAPE_SHOP_PREVIEW_CARDS,
} from '@/lib/grandscapeMirrorPack';
import { grandscapeFaceSource, grandscapeMarketingSource } from '@/lib/grandscapeMirrorImages';
import { useGrandscapePack } from '@/lib/useGrandscapePack';
import { useColors } from '@/hooks/useColors';
import { useSubscription } from '@/lib/revenuecat';
import { membershipPriceLine, paywallRole } from '@workspace/monetization/client';
import DuoSplit from '@/components/DuoSplit';


interface CosmeticsModalProps {
  visible: boolean;
  onClose: () => void;
  /** Debug previews can open on CARDS. The store still opens on ARENAS. */
  initialTab?: 'arenas' | 'cards';
}

/**
 * Full-screen cosmetics picker with two tabs: ARENAS and CARDS.
 * Premium arenas and premium card skins are gated behind an active
 * RevenueCat subscription — tapping one while unsubscribed opens the paywall.
 */
export default function CosmeticsModal({ visible, onClose, initialTab = 'arenas' }: CosmeticsModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cardSkin, arena, setCardSkin, setArena } = useCosmetics();
  const { isSubscribed, offerings } = useSubscription();
  const priceNote = membershipPriceLine(
    (offerings?.current?.availablePackages ?? []).map((pkg) => ({
      role: paywallRole(pkg.product.identifier),
      priceString: pkg.product.priceString,
    })),
  );
  const [tab, setTab] = useState<'arenas' | 'cards'>(initialTab);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string | undefined>(undefined);

  const openPaywall = (feature: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setPaywallFeature(feature);
    setPaywallVisible(true);
  };

  const pickArena = (a: Arena) => {
    if (a.premium && !isSubscribed) {
      openPaywall(`Unlock the "${a.name}" arena`);
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setArena(a.id);
  };
  const pickCard = (skin: CardSkin) => {
    if (!skin.unlocked && !isSubscribed) {
      openPaywall(`Unlock the "${skin.name}" card skin`);
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setCardSkin(skin.id, isSubscribed);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen" transparent>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
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
        </View>

        <DuoSplit
          primary={
        <ScrollView testID="card-skin-list" style={{ flex: 1 }} contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {tab === 'arenas' &&
            ARENAS.map((a: Arena) => (
              <CosmeticRow
                key={a.id}
                name={a.name}
                description={a.description}
                badge={a.premium ? 'premium' : null}
                locked={a.premium && !isSubscribed}
                selected={arena === a.id}
                onPress={() => pickArena(a)}
                preview={<ArenaPreview arenaId={a.id} />}
              />
            ))}

          {tab === 'cards' && <GrandscapePackRow />}
          {tab === 'cards' &&
            CARD_SKINS.filter((c) => !isRetiredBasicSkin(c.id)).map((c: CardSkin) => (
              <CosmeticRow
                key={c.id}
                name={c.name}
                description={c.description}
                badge={c.unlocked ? null : 'premium'}
                locked={!c.unlocked && !isSubscribed}
                selected={cardSkin === c.id}
                onPress={() => pickCard(c)}
                preview={<CardSkinPreview cardSkinId={c.id} />}
              />
            ))}

        </ScrollView>
          }
          secondary={
            <View style={styles.pricePane}>
              <Text style={[styles.footnote, { color: colors.foreground }]}>{priceNote}</Text>
            </View>
          }
        />
      </View>

      <PaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        featureLabel={paywallFeature}
      />
    </Modal>
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
  badge: 'premium' | null;
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
        </View>
        <Text style={[styles.itemDesc, { color: colors.mutedForeground }]} numberOfLines={4}>
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

const ARENA_IMAGES: Record<ArenaId, ImageSourcePropType> = {
  greenTable: require('../assets/arenas/jackpot-still.jpg'),
  classic:   require('../assets/arenas/flamingo_floor.png'),
  cosmic:    require('../assets/arenas/cosmic_sanctum.png'),
  royal:     require('../assets/arenas/olympus_throne.png'),
  lightning: require('../assets/arenas/oasis_cave.png'),
  matrix:      require('../assets/arenas/matrix_arena.png'),
  rainbowRoad: require('../assets/scenes/rainbowRoad/portrait/L0_far.jpg'),
};

function ArenaPreview({ arenaId }: { arenaId: ArenaId }) {
  return (
    <View style={styles.arenaPreviewBox}>
      <Image source={ARENA_IMAGES[arenaId]} style={styles.arenaPreviewImage} resizeMode="cover" />
    </View>
  );
}

function GrandscapePackRow() {
  const colors = useColors();
  const pack = useGrandscapePack();
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState<string | null>(null);
  const marketing = grandscapeMarketingSource();
  const previewFaces = GRANDSCAPE_SHOP_PREVIEW_CARDS
    .map((card) => ({ card, source: grandscapeFaceSource(card) }))
    .filter((item) => item.source != null);
  const checking = pack.storeLoading && !pack.owns;
  const busy = pack.isPurchasing || pack.isRestoring;
  const actionLabel = checking ? 'Checking…' : pack.shop.actionLabel;

  const onPress = async () => {
    setError(null);
    setNote(null);
    try {
      if (pack.shop.canUnequip) {
        pack.unequip();
        Haptics.selectionAsync().catch(() => {});
        return;
      }
      if (pack.shop.canEquip) {
        pack.equip();
        Haptics.selectionAsync().catch(() => {});
        return;
      }
      if (!pack.shop.canPurchase) return;
      Haptics.selectionAsync().catch(() => {});
      const result = await pack.buy();
      if (result === 'purchased') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const onRestore = async () => {
    setError(null);
    setNote(null);
    try {
      const restored = await pack.restorePack();
      setNote(restored ? 'Grandscape Mirror Pack restored on this Apple ID.' : 'No Grandscape Mirror Pack found on this Apple ID.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed. Please try again.');
    }
  };

  const locked = pack.shop.status === 'unavailable' || pack.shop.status === 'available';

  return (
    <View testID="grandscape-mirror-pack-row" style={[styles.itemRow, { borderColor: pack.equipped ? colors.neonGold : '#3a1a5e', backgroundColor: pack.equipped ? '#3a1a5e80' : '#1a053590' }]}>
      <View style={styles.itemPreview}>
        {marketing ? (
          <Image source={marketing} resizeMode="contain" style={styles.arenaPreviewImage} accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.packMark}>
            <Text style={[styles.packMarkText, { color: colors.neonGold }]}>GM</Text>
          </View>
        )}
      </View>
      <View style={styles.itemMeta}>
        <View style={styles.itemNameRow}>
          <Text style={[styles.itemName, { color: colors.foreground }]} numberOfLines={2}>
            {GRANDSCAPE_MIRROR_PACK.name}
          </Text>
          <View style={[styles.premiumBadge, { borderColor: colors.neonGold }]}>
            <Text style={[styles.premiumText, { color: colors.neonGold }]}>{pack.shop.priceLabel}</Text>
          </View>
        </View>
        <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>
          {GRANDSCAPE_MIRROR_PACK.description}
        </Text>
        {previewFaces.length > 0 ? (
          <View style={styles.faceStrip}>
            {previewFaces.map((item) => (
              <Image
                key={`${item.card.suit}${item.card.value}`}
                source={item.source!}
                resizeMode="contain"
                style={styles.faceThumb}
                accessibilityIgnoresInvertColors
              />
            ))}
          </View>
        ) : null}
        <View style={styles.packActions}>
          <Pressable
            testID="grandscape-mirror-pack-action"
            onPress={() => { void onPress(); }}
            disabled={busy || checking || (!pack.shop.canPurchase && !pack.shop.canEquip && !pack.shop.canUnequip)}
            style={[
              styles.packAction,
              {
                borderColor: colors.neonGold,
                opacity: locked && pack.shop.status === 'unavailable' ? 0.55 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.neonGold} />
            ) : (
              <Text style={[styles.packActionText, { color: colors.neonGold }]}>{actionLabel}</Text>
            )}
          </Pressable>
          <Pressable onPress={() => { void onRestore(); }} disabled={busy} hitSlop={6}>
            <Text style={[styles.tapToEquip, { color: colors.mutedForeground }]}>
              {pack.isRestoring ? 'Restoring…' : 'Restore Purchases'}
            </Text>
          </Pressable>
        </View>
        {pack.equipped ? (
          <Text style={[styles.equippedText, { color: colors.neonGold }]}>✓ EQUIPPED</Text>
        ) : pack.shop.status === 'owned' ? (
          <Text style={[styles.tapToEquip, { color: colors.mutedForeground }]}>Owned. Tap Equip to use it.</Text>
        ) : null}
        {error ? <Text style={styles.packError}>{error}</Text> : null}
        {note ? <Text style={[styles.tapToEquip, { color: colors.foreground }]}>{note}</Text> : null}
      </View>
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
  arenaPreviewImage: {
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
    ...StyleSheet.absoluteFill,
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
  packMark: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packMarkText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  faceStrip: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  faceThumb: {
    width: 28,
    height: 42,
  },
  packActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  packAction: {
    minWidth: 108,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a1a5e60',
  },
  packActionText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  packError: {
    color: '#fb7185',
    fontSize: 11,
    marginTop: 2,
  },
  pricePane: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  footnote: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingTop: 12,
    paddingHorizontal: 12,
  },
});

void LinearGradient;
