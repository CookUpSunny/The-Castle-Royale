import { Cinzel_400Regular, Cinzel_700Bold, useFonts } from '@expo-google-fonts/cinzel';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { PurchasesPackage } from 'react-native-purchases';
import { ARENAS, useCosmetics } from '@/contexts/CosmeticsContext';
import ArenaBackground, { ARENA_IMAGES } from '@/components/ArenaBackground';
import BackButton from '@/components/BackButton';
import PaywallScreen from '@/components/PaywallScreen';
import ShopGoldButton from '@/components/ShopGoldButton';
import {
  GRANDSCAPE_MIRROR_PACK,
  GRANDSCAPE_LIFETIME_PACKAGE_ID,
  GRANDSCAPE_SHOP_PREVIEW_CARDS,
  isStorePurchaseCancelled,
} from '@/lib/grandscapeMirrorPack';
import {
  grandscapeCardBackSource,
  grandscapeFaceSource,
  grandscapeMarketingSource,
} from '@/lib/grandscapeMirrorImages';
import { REVENUECAT_ENTITLEMENT_IDENTIFIER, useSubscription } from '@/lib/revenuecat';
import {
  SHOP_ARENA_CATALOG,
  activeEntitlementIds,
  arenaStoreInput,
  cardPackStoreInput,
  findPricedPackage,
  resolveStoreItemState,
  type ShopArenaEntry,
  type StoreItemState,
} from '@/lib/royalShop';
import { restoredShopOrientationLock } from '@/lib/shopOrientation';
import { useGrandscapePack } from '@/lib/useGrandscapePack';
import type { ArenaId } from '@/lib/loadoutSelection';

type ShopTab = 'packs' | 'arenas' | 'memberships';

const TABS: { id: ShopTab; label: string }[] = [
  { id: 'packs', label: 'Card Packs' },
  { id: 'arenas', label: 'Arenas' },
  { id: 'memberships', label: 'Memberships' },
];

const TILE_WIDTH = 168;

function arenaName(id: ArenaId): string {
  return ARENAS.find((arena) => arena.id === id)?.name ?? id;
}

/**
 * Landscape only while this screen is mounted. The previous lock is put back
 * on close, which for this app is DEFAULT, so a match still follows the phone.
 */
function useShopLandscapeLock() {
  useEffect(() => {
    let alive = true;
    let restoreName = 'DEFAULT';
    (async () => {
      try {
        const previous = await ScreenOrientation.getOrientationLockAsync();
        restoreName = restoredShopOrientationLock(ScreenOrientation.OrientationLock[previous]);
        if (!alive) return;
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      } catch {
        // Web and hosts without the native module keep the current orientation.
      }
    })();
    return () => {
      alive = false;
      const named = ScreenOrientation.OrientationLock[restoreName as keyof typeof ScreenOrientation.OrientationLock];
      const restore = typeof named === 'number' ? named : ScreenOrientation.OrientationLock.DEFAULT;
      ScreenOrientation.lockAsync(restore).catch(() => {
        void ScreenOrientation.unlockAsync().catch(() => {});
      });
    };
  }, []);
}

export default function RoyalShop() {
  useShopLandscapeLock();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ Cinzel_700Bold, Cinzel_400Regular });
  const titleFont = fontsLoaded ? 'Cinzel_700Bold' : undefined;
  const bodyFont = fontsLoaded ? 'Cinzel_400Regular' : undefined;
  const { arena, setArena } = useCosmetics();
  const pack = useGrandscapePack();
  const { offerings, customerInfo, purchase, restore, isPurchasing, isRestoring, isSubscribed } = useSubscription();
  const [tab, setTab] = useState<ShopTab>('packs');
  const [packOpen, setPackOpen] = useState(false);
  const [arenaIndex, setArenaIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'info' | 'error'>('info');

  const entitlementIds = useMemo(() => activeEntitlementIds(customerInfo), [customerInfo]);
  const packPending = pack.storeLoading && !pack.owns;
  const packState = resolveStoreItemState(cardPackStoreInput({
    owns: pack.owns,
    equipped: pack.equipped,
    priceString: pack.shop.canPurchase ? pack.shop.priceLabel : null,
  }));
  const packShown: StoreItemState = packPending
    ? { ...packState, actionLabel: 'Checking…' }
    : packState;

  const arenaStates = useMemo(() => {
    return SHOP_ARENA_CATALOG.map((entry) => {
      const priced = findPricedPackage(offerings ?? null, entry.productId, entry.productId
        ? { offeringId: entry.productId, packageId: GRANDSCAPE_LIFETIME_PACKAGE_ID }
        : undefined);
      const state = resolveStoreItemState(arenaStoreInput(entry, {
        equipped: arena === entry.id,
        isSubscribed,
        activeEntitlementIds: entitlementIds,
        priceString: priced?.product?.priceString,
      }));
      return { entry, state };
    });
  }, [arena, entitlementIds, isSubscribed, offerings]);

  const showNotice = (message: string | null, tone: 'info' | 'error' = 'info') => {
    setNotice(message);
    setNoticeTone(tone);
  };

  const openArena = (id: ArenaId) => {
    const index = SHOP_ARENA_CATALOG.findIndex((entry) => entry.id === id);
    setPackOpen(false);
    setArenaIndex(index === -1 ? 0 : index);
    setTab('arenas');
  };

  const onBuyPack = async () => {
    showNotice(null);
    Haptics.selectionAsync().catch(() => {});
    try {
      const result = await pack.buy();
      if (result === 'purchased') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showNotice('Grandscape Mirror Pack is unlocked and equipped.');
        return;
      }
      if (result === 'cancelled') {
        showNotice(null);
        return;
      }
      showNotice('Coming soon.');
    } catch (err) {
      if (isStorePurchaseCancelled(err)) {
        showNotice(null);
        return;
      }
      showNotice(err instanceof Error ? err.message : 'Purchase failed. Please try again.', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const onBuyArena = async (entry: ShopArenaEntry) => {
    showNotice(null);
    const priced = findPricedPackage(offerings ?? null, entry.productId, entry.productId
      ? { offeringId: entry.productId, packageId: GRANDSCAPE_LIFETIME_PACKAGE_ID }
      : undefined);
    if (!priced) {
      showNotice('Coming soon.');
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    try {
      const info = await purchase(priced as PurchasesPackage);
      const ids = activeEntitlementIds(info);
      const subscribed = ids.includes(REVENUECAT_ENTITLEMENT_IDENTIFIER);
      const next = resolveStoreItemState(arenaStoreInput(entry, {
        equipped: false,
        isSubscribed: subscribed,
        activeEntitlementIds: ids,
        priceString: null,
      }));
      if (next.status === 'owned' || next.status === 'equipped') {
        setArena(entry.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showNotice(`${arenaName(entry.id)} is unlocked and selected.`);
      }
    } catch (err) {
      if (isStorePurchaseCancelled(err)) {
        showNotice(null);
        return;
      }
      showNotice(err instanceof Error ? err.message : 'Purchase failed. Please try again.', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const onRestore = async () => {
    showNotice(null);
    Haptics.selectionAsync().catch(() => {});
    try {
      const info = await restore();
      const ids = activeEntitlementIds(info);
      const restored = ids.length > 0;
      showNotice(restored ? 'Purchases restored.' : 'No purchases to restore on this Apple ID.');
      if (restored) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Restore failed. Please try again.', 'error');
    }
  };

  const onSelectArena = (entry: ShopArenaEntry) => {
    setArena(entry.id);
    Haptics.selectionAsync().catch(() => {});
    showNotice(`${arenaName(entry.id)} selected.`);
  };

  const onEquipPack = () => {
    pack.equip();
    Haptics.selectionAsync().catch(() => {});
    showNotice('Grandscape Mirror Pack equipped.');
  };

  const goBack = () => {
    if (packOpen || arenaIndex !== null) {
      setPackOpen(false);
      setArenaIndex(null);
      return;
    }
    router.back();
  };

  const selectTab = (next: ShopTab) => {
    setTab(next);
    setPackOpen(false);
    setArenaIndex(null);
  };

  const detailArena = arenaIndex !== null ? arenaStates[arenaIndex] : null;
  const showingArena = Boolean(detailArena);
  const gridItems = tab === 'packs' ? 1 : arenaStates.length;
  const columns = Math.max(1, Math.ceil(gridItems / 2));
  const gridWidth = columns * TILE_WIDTH + Math.max(0, columns - 1) * 12;

  return (
    <View style={styles.root}>
      {showingArena && detailArena ? (
        <ArenaBackground arenaOverride={detailArena.entry.id} />
      ) : (
        <LinearGradient
          colors={['#1a0a28', '#07140f', '#07000f']}
          locations={[0, 0.45, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
      {showingArena ? <View pointerEvents="none" style={styles.scrim} /> : null}

      <View style={[styles.topBar, { paddingTop: insets.top + 8, paddingLeft: insets.left + 14, paddingRight: insets.right + 14 }]}>
        <BackButton label="← BACK" onPress={goBack} labelStyle={styles.backLabel} />
        <View style={styles.titleBlock}>
          <Text style={[styles.kicker, bodyFont ? { fontFamily: bodyFont } : null]}>Castle Royale</Text>
          <Text style={[styles.title, titleFont ? { fontFamily: titleFont } : null]}>Royal Shop</Text>
          <Text style={styles.subtitle} numberOfLines={1}>Cosmetic looks for your table. Match rules stay the same.</Text>
        </View>
        <View style={styles.tabs}>
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <Pressable
                key={item.id}
                testID={`shop-tab-${item.id}`}
                onPress={() => selectTab(item.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {tab === 'memberships' ? (
        <View style={[styles.body, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: insets.bottom + 8 }]}>
          <PaywallScreen shopEntry onClose={() => selectTab('packs')} />
        </View>
      ) : packOpen ? (
        <DetailStage
          title={GRANDSCAPE_MIRROR_PACK.name}
          body={GRANDSCAPE_MIRROR_PACK.description}
          note="Cosmetic card faces and a matching back. One-time unlock. It does not change how a hand is played."
          state={packShown}
          titleFont={titleFont}
          bodyFont={bodyFont}
          busy={pack.isPurchasing || isPurchasing}
          notice={notice}
          noticeTone={noticeTone}
          onBuy={() => void onBuyPack()}
          onSelect={onEquipPack}
          hero={<PackFan />}
          edge={insets.left}
        />
      ) : detailArena ? (
        <DetailStage
          title={arenaName(detailArena.entry.id)}
          body={detailArena.entry.blurb}
          note="A cosmetic table. Selecting it changes the look behind your cards, not the rules."
          state={detailArena.state}
          titleFont={titleFont}
          bodyFont={bodyFont}
          busy={isPurchasing}
          notice={notice}
          noticeTone={noticeTone}
          onBuy={() => void onBuyArena(detailArena.entry)}
          onSelect={() => onSelectArena(detailArena.entry)}
          onPrev={() => setArenaIndex((index) => {
            const current = index ?? 0;
            return (current - 1 + SHOP_ARENA_CATALOG.length) % SHOP_ARENA_CATALOG.length;
          })}
          onNext={() => setArenaIndex((index) => {
            const current = index ?? 0;
            return (current + 1) % SHOP_ARENA_CATALOG.length;
          })}
          hero={<ArenaHero id={detailArena.entry.id} />}
          edge={insets.left}
        />
      ) : (
        <View style={[styles.body, { paddingLeft: insets.left + 16, paddingRight: insets.right + 8, paddingBottom: insets.bottom + 8 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
            <View style={[styles.grid, { width: Math.max(gridWidth, width - insets.left - insets.right - 32) }]}>
              {tab === 'packs' ? (
                <ShopTile
                  testID="shop-tile-grandscape"
                  name={GRANDSCAPE_MIRROR_PACK.name}
                  state={packShown}
                  titleFont={titleFont}
                  onPress={() => setPackOpen(true)}
                  art={
                    <Image
                      source={grandscapeMarketingSource() ?? grandscapeCardBackSource() ?? undefined}
                      style={styles.tileArtImage}
                      contentFit="contain"
                      accessibilityLabel={GRANDSCAPE_MIRROR_PACK.name}
                    />
                  }
                />
              ) : (
                arenaStates.map(({ entry, state }) => (
                  <ShopTile
                    key={entry.id}
                    testID={`shop-tile-arena-${entry.id}`}
                    name={arenaName(entry.id)}
                    state={state}
                    titleFont={titleFont}
                    onPress={() => openArena(entry.id)}
                    art={
                      <Image
                        source={ARENA_IMAGES[entry.id]}
                        style={styles.tileArtFill}
                        contentFit="cover"
                        accessibilityLabel={arenaName(entry.id)}
                      />
                    }
                  />
                ))
              )}
            </View>
          </ScrollView>
          <View style={styles.gridFooter}>
            {notice ? (
              <Text style={[styles.notice, noticeTone === 'error' && styles.noticeError]}>{notice}</Text>
            ) : <View />}
            <Pressable
              testID="shop-restore"
              onPress={() => void onRestore()}
              disabled={isRestoring || pack.isRestoring}
              style={styles.restoreBtn}
            >
              <Text style={styles.restoreText}>
                {isRestoring || pack.isRestoring ? 'Restoring…' : 'Restore Purchases'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function ShopTile({
  testID,
  name,
  state,
  titleFont,
  art,
  onPress,
}: {
  testID: string;
  name: string;
  state: StoreItemState;
  titleFont?: string;
  art: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        state.status === 'equipped' && styles.tileEquipped,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.tileArt}>
        {art}
        {state.locked ? (
          <View style={styles.lockBadge}>
            <Text style={styles.lockGlyph}>🔒</Text>
          </View>
        ) : null}
        {state.status === 'equipped' ? (
          <View style={[styles.statusBadge, styles.statusEquipped]}>
            <Text style={styles.statusEquippedText}>Equipped</Text>
          </View>
        ) : state.status === 'owned' ? (
          <View style={[styles.statusBadge, styles.statusOwned]}>
            <Text style={styles.statusOwnedText}>Owned</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.tileName, titleFont ? { fontFamily: titleFont } : null]} numberOfLines={2}>
        {name}
      </Text>
      {state.showPrice && state.priceLabel ? (
        <Text style={styles.tilePrice}>{state.priceLabel}</Text>
      ) : state.actionLabel === 'Checking…' ? (
        <Text style={styles.tileSoon}>Checking…</Text>
      ) : state.status === 'unavailable' ? (
        <Text style={styles.tileSoon}>Coming soon</Text>
      ) : (
        <Text style={styles.tileOwnedCaption}>{state.status === 'equipped' ? 'Equipped' : 'Owned'}</Text>
      )}
    </Pressable>
  );
}

function PackFan() {
  const faces = GRANDSCAPE_SHOP_PREVIEW_CARDS.map((card) => grandscapeFaceSource(card)).filter(Boolean);
  const back = grandscapeCardBackSource();
  return (
    <View style={styles.fanRow} testID="shop-pack-preview">
      {faces.map((source, index) => (
        <View
          key={index}
          style={[
            styles.fanCard,
            {
              marginLeft: index === 0 ? 0 : -34,
              zIndex: index,
              transform: [{ rotate: `${(index - (faces.length - 1) / 2) * 8}deg` }],
            },
          ]}
        >
          <Image source={source ?? undefined} style={styles.fanImage} contentFit="contain" />
        </View>
      ))}
      {back ? (
        <View style={[styles.fanCard, styles.fanBack, { zIndex: faces.length }]}>
          <Image source={back} style={styles.fanImage} contentFit="contain" />
        </View>
      ) : null}
    </View>
  );
}

function ArenaHero({ id }: { id: ArenaId }) {
  return (
    <View style={styles.arenaHero} testID="shop-arena-hero">
      <Image
        source={ARENA_IMAGES[id]}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        accessibilityLabel={arenaName(id)}
      />
    </View>
  );
}

function DetailStage({
  hero,
  title,
  body,
  note,
  state,
  titleFont,
  bodyFont,
  busy,
  notice,
  noticeTone,
  onBuy,
  onSelect,
  onPrev,
  onNext,
  edge,
}: {
  hero: React.ReactNode;
  title: string;
  body: string;
  note: string;
  state: StoreItemState;
  titleFont?: string;
  bodyFont?: string;
  busy: boolean;
  notice: string | null;
  noticeTone: 'info' | 'error';
  onBuy: () => void;
  onSelect: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  edge: number;
}) {
  const disabled = busy || (!state.canPurchase && !state.canSelect);
  const onPress = state.canPurchase ? onBuy : state.canSelect ? onSelect : undefined;
  return (
    <View style={[styles.detailRow, { paddingLeft: edge + 8, paddingRight: edge + 16 }]} testID="shop-detail">
      {onPrev ? (
        <Pressable testID="shop-arena-prev" onPress={onPrev} style={styles.arrow} accessibilityLabel="Previous arena">
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
      ) : null}
      <View style={styles.heroSlot}>{hero}</View>
      {onNext ? (
        <Pressable testID="shop-arena-next" onPress={onNext} style={styles.arrow} accessibilityLabel="Next arena">
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      ) : null}
      <View style={styles.copyPanel}>
        <Text style={[styles.detailName, titleFont ? { fontFamily: titleFont } : null]}>{title}</Text>
        <Text style={[styles.detailBody, bodyFont ? { fontFamily: bodyFont } : null]}>{body}</Text>
        <Text style={styles.detailNote}>{note}</Text>
        <ShopGoldButton label={busy ? 'Please wait…' : state.actionLabel} disabled={disabled} onPress={onPress} />
        {notice ? <Text style={[styles.notice, noticeTone === 'error' && styles.noticeError]}>{notice}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07000f' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7, 0, 15, 0.62)' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 6 },
  titleBlock: { flexShrink: 1, maxWidth: 280 },
  backLabel: { color: '#f0d78c', letterSpacing: 1.4 },
  kicker: {
    color: '#7ee7ff',
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f6e7a8',
    fontSize: 26,
    letterSpacing: 0.4,
    textShadowColor: 'rgba(255, 215, 0, 0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  subtitle: { color: '#c4b6de', fontSize: 12, marginTop: 1 },
  tabs: { flexDirection: 'row', gap: 8, marginLeft: 'auto' },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(240, 215, 140, 0.28)',
    backgroundColor: 'rgba(12, 6, 24, 0.72)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(224, 176, 58, 0.22)',
    borderColor: '#f0d78c',
    shadowColor: '#f0d78c',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  tabText: { color: '#b7a8cf', fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#f8e7a2' },
  body: { flex: 1, minHeight: 0 },
  gridScroll: { alignItems: 'flex-start', paddingRight: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start' },
  gridFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  tile: {
    width: TILE_WIDTH,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(240, 215, 140, 0.55)',
    backgroundColor: 'rgba(10, 18, 16, 0.92)',
    padding: 8,
    shadowColor: '#00e5ff',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  tileEquipped: {
    borderColor: '#f0d78c',
    shadowColor: '#f0d78c',
    shadowOpacity: 0.55,
  },
  tileArt: {
    height: 78,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#12081c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileArtImage: { width: '86%', height: '92%' },
  tileArtFill: { ...StyleSheet.absoluteFillObject },
  lockBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(8, 4, 16, 0.82)',
    borderWidth: 1,
    borderColor: '#f0d78c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlyph: { fontSize: 12 },
  statusBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusEquipped: { backgroundColor: '#f0d78c' },
  statusEquippedText: { color: '#1a1004', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  statusOwned: {
    backgroundColor: 'rgba(6, 20, 28, 0.85)',
    borderWidth: 1,
    borderColor: '#7ee7ff',
  },
  statusOwnedText: { color: '#7ee7ff', fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  tileName: { color: '#f7f1e4', fontSize: 13, marginTop: 6, minHeight: 32 },
  tilePrice: { color: '#f0d78c', fontSize: 12, fontWeight: '800', marginTop: 2 },
  tileSoon: { color: '#9d8fb4', fontSize: 12, marginTop: 2 },
  tileOwnedCaption: { color: '#7ee7ff', fontSize: 12, fontWeight: '700', marginTop: 2 },
  notice: { color: '#f0d78c', fontSize: 13, flex: 1 },
  noticeError: { color: '#ff8aa0' },
  restoreBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  restoreText: { color: '#7ee7ff', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  detailRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 0 },
  heroSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  copyPanel: { width: 320, justifyContent: 'center', paddingVertical: 8 },
  fanRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 150,
  },
  fanCard: {
    width: 78,
    height: 108,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#140818',
    borderWidth: 1,
    borderColor: 'rgba(240, 215, 140, 0.65)',
    shadowColor: '#f0d78c',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  fanBack: { marginLeft: -26, transform: [{ rotate: '7deg' }] },
  fanImage: { width: '100%', height: '100%' },
  arenaHero: {
    width: 340,
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(240, 215, 140, 0.75)',
    backgroundColor: '#140818',
    shadowColor: '#f0d78c',
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  detailName: {
    color: '#f6e7a8',
    fontSize: 26,
    textShadowColor: 'rgba(255, 215, 0, 0.35)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  detailBody: { color: '#f4efe4', fontSize: 14, lineHeight: 20, marginTop: 8 },
  detailNote: { color: '#b7a8cf', fontSize: 12, lineHeight: 17, marginTop: 8, marginBottom: 14 },
  arrow: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(10, 6, 18, 0.72)',
    borderWidth: 1,
    borderColor: '#f0d78c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#f6e7a8', fontSize: 28, lineHeight: 30, marginTop: -2 },
});
