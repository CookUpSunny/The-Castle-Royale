import { Cinzel_700Bold, useFonts } from '@expo-google-fonts/cinzel';
import { BlurView } from 'expo-blur';
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
import SceneBackground from '@/components/SceneBackground';
import { ARENA_IMAGES } from '@/components/ArenaBackground';
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
  SHOP_PACK_BLURB,
  SHOP_TAGLINE,
  activeEntitlementIds,
  arenaStoreInput,
  cardPackStoreInput,
  findPricedPackage,
  resolveStoreItemState,
  type ShopArenaEntry,
  type StoreItemState,
} from '@/lib/royalShop';
import { sceneIdForArena } from '@/lib/arenaScene';
import { restoredShopOrientationLock } from '@/lib/shopOrientation';
import { useGrandscapePack } from '@/lib/useGrandscapePack';
import type { ArenaId } from '@/lib/loadoutSelection';

type ShopTab = 'packs' | 'arenas' | 'memberships';

const TABS: { id: ShopTab; label: string }[] = [
  { id: 'packs', label: 'Card Packs' },
  { id: 'arenas', label: 'Arenas' },
  { id: 'memberships', label: 'Memberships' },
];

const SHOP_NEBULA = require('../assets/shop/shop-bg-nebula.jpg') as number;

/** Left card is the normal size. Each card to the right steps up so the fan comes toward the viewer. */
const FAN_BASE_WIDTH = 126;
const FAN_BASE_HEIGHT = 176;
const FAN_SCALE_STEP = 0.07;
const FAN_OVERLAP = 0.66;

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
  const { width, height } = useWindowDimensions();
  const [fontsLoaded] = useFonts({ Cinzel_700Bold });
  const titleFont = fontsLoaded ? 'Cinzel_700Bold' : undefined;
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
  const gridItems = tab === 'packs' ? 1 : arenaStates.length;
  const columns = Math.max(1, Math.ceil(gridItems / 2));
  const tileH = Math.max(112, Math.min(150, Math.floor((height - insets.top - insets.bottom - 112) / 2)));
  const tileW = Math.round(tileH * 4 / 3);
  const gridWidth = columns * tileW + Math.max(0, columns - 1) * 12;

  return (
    <View style={styles.root}>
      {detailArena ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <SceneBackground
            sceneOverride={sceneIdForArena(detailArena.entry.id)}
            arenaOverride={detailArena.entry.id}
          />
        </View>
      ) : packOpen ? (
        <LinearGradient
          colors={['#0e3a22', '#082016', '#0a2c18']}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Image source={SHOP_NEBULA} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
      {detailArena ? null : <View pointerEvents="none" style={packOpen ? styles.feltShade : styles.scrim} />}

      <View style={[styles.header, { paddingTop: insets.top + 8, paddingLeft: insets.left + 14, paddingRight: insets.right + 14 }]}>
      <View style={styles.topBar}>
        <BackButton label="← BACK" onPress={goBack} labelStyle={styles.backLabel} />
        <View style={styles.titleBlock}>
          <Text style={[styles.kicker, titleFont ? { fontFamily: titleFont } : null]}>The Castle Royale</Text>
          <Text style={[styles.title, titleFont ? { fontFamily: titleFont } : null]}>Royal Shop</Text>
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
                <Text style={[styles.tabText, titleFont ? { fontFamily: titleFont } : null, active && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <ShopGoldButton
          compact
          testID="shop-restore"
          label={isRestoring || pack.isRestoring ? 'Restoring…' : 'Restore'}
          disabled={isRestoring || pack.isRestoring}
          onPress={() => void onRestore()}
        />
      </View>
        <ShopTagline fontFamily={titleFont} />
      </View>

      {tab === 'memberships' ? (
        <View style={[styles.body, { paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: insets.bottom + 8 }]}>
          <PaywallScreen shopEntry onClose={() => selectTab('packs')} />
        </View>
      ) : packOpen ? (
        <DetailStage
          title={GRANDSCAPE_MIRROR_PACK.name}
          body={SHOP_PACK_BLURB}
          state={packShown}
          titleFont={titleFont}
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
          state={detailArena.state}
          titleFont={titleFont}
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
          hero={<ArenaPortrait id={detailArena.entry.id} />}
          edge={insets.left}
        />
      ) : (
        <View style={[styles.body, { paddingLeft: insets.left + 16, paddingRight: insets.right + 8, paddingBottom: insets.bottom + 8 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScroll}>
            <View style={[styles.grid, { width: Math.max(gridWidth, width - insets.left - insets.right - 32) }]}>
              {tab === 'packs' ? (
                <ShopTile
                  testID="shop-tile-grandscape"
                  width={tileW}
                  height={tileH}
                  name={GRANDSCAPE_MIRROR_PACK.name}
                  state={packShown}
                  titleFont={titleFont}
                  onPress={() => setPackOpen(true)}
                  art={
                    <Image
                      source={grandscapeMarketingSource() ?? grandscapeCardBackSource() ?? undefined}
                      style={styles.tileArtFill}
                      contentFit="cover"
                      accessibilityLabel={GRANDSCAPE_MIRROR_PACK.name}
                    />
                  }
                />
              ) : (
                arenaStates.map(({ entry, state }) => (
                  <ShopTile
                    key={entry.id}
                    testID={`shop-tile-arena-${entry.id}`}
                    width={tileW}
                    height={tileH}
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
          {notice ? (
            <Text style={[styles.notice, noticeTone === 'error' && styles.noticeError]}>{notice}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

function ShopTagline({ fontFamily }: { fontFamily?: string }) {
  return (
    <View style={styles.taglineBanner}>
      <BlurView intensity={24} tint="light" style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.taglineWash} />
      <Text
        style={[styles.subtitle, fontFamily ? { fontFamily } : null]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.55}
      >
        {SHOP_TAGLINE}
      </Text>
    </View>
  );
}

function OrnateGoldFrame({
  width,
  height,
  equipped,
  children,
}: {
  width: number;
  height: number;
  equipped?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.frameShadow, equipped && styles.frameShadowEquipped, { width, height }]}>
      <LinearGradient
        colors={['#fff6d2', '#f0d078', '#8a5a14', '#f8e7a2', '#6b4510', '#fff1c2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bezel}
      >
        <View style={styles.bezelGroove}>
          <View style={styles.artWell}>
            {children}
            <View pointerEvents="none" style={styles.innerGlow} />
          </View>
        </View>
        <CornerFlourish corner="tl" />
        <CornerFlourish corner="tr" />
        <CornerFlourish corner="bl" />
        <CornerFlourish corner="br" />
      </LinearGradient>
    </View>
  );
}

function CornerFlourish({ corner }: { corner: 'tl' | 'tr' | 'bl' | 'br' }) {
  const pos = {
    tl: styles.flourishTL,
    tr: styles.flourishTR,
    bl: styles.flourishBL,
    br: styles.flourishBR,
  }[corner];
  return (
    <View pointerEvents="none" style={[styles.flourish, pos]}>
      <View style={styles.flourishGem} />
      <View style={styles.flourishSpark} />
    </View>
  );
}

function ShopTile({
  testID,
  width,
  height,
  name,
  state,
  titleFont,
  art,
  onPress,
}: {
  testID: string;
  width: number;
  height: number;
  name: string;
  state: StoreItemState;
  titleFont?: string;
  art: React.ReactNode;
  onPress: () => void;
}) {
  const caption = state.showPrice && state.priceLabel
    ? state.priceLabel
    : state.actionLabel === 'Checking…'
      ? 'Checking…'
      : state.status === 'unavailable'
        ? 'Coming soon'
        : null;
  const badge = state.status === 'equipped' ? 'Equipped' : state.status === 'owned' ? 'Owned' : null;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.92 }]}
    >
      <OrnateGoldFrame width={width} height={height} equipped={state.status === 'equipped'}>
        {art}
        {state.locked ? (
          <View style={styles.lockBadge}>
            <Text style={styles.lockGlyph}>🔒</Text>
          </View>
        ) : null}
        {badge ? (
          <View style={[styles.statusBadge, state.status === 'equipped' ? styles.statusEquipped : styles.statusOwned]}>
            <Text style={state.status === 'equipped' ? styles.statusEquippedText : styles.statusOwnedText}>{badge}</Text>
          </View>
        ) : null}
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', 'rgba(8, 6, 2, 0.88)']}
          style={styles.titleWash}
        >
          <Text style={[styles.tileName, titleFont ? { fontFamily: titleFont } : null]} numberOfLines={2}>
            {name}
          </Text>
          {caption ? (
            <Text style={state.showPrice ? styles.tilePrice : styles.tileSoon}>{caption}</Text>
          ) : null}
        </LinearGradient>
      </OrnateGoldFrame>
    </Pressable>
  );
}

function PackFan() {
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const playable = GRANDSCAPE_SHOP_PREVIEW_CARDS.map((card) => grandscapeFaceSource(card)).filter(Boolean);
  const marketing = grandscapeMarketingSource();
  const faces = marketing ? [...playable, marketing] : playable;
  const back = grandscapeCardBackSource();
  const cards = [
    ...faces.map((source, index) => ({ key: `face-${index}`, source })),
    ...(back ? [{ key: 'back', source: back }] : []),
  ];
  const count = cards.length;
  let natural = 0;
  for (let index = 0; index < count; index += 1) {
    const cardW = Math.round(FAN_BASE_WIDTH * (1 + index * FAN_SCALE_STEP));
    natural = index === 0 ? cardW : natural + cardW - Math.round(cardW * FAN_OVERLAP);
  }
  const budget = Math.max(220, screenW - insets.left - insets.right - 360);
  const fit = Math.min(1, budget / Math.max(natural, 1));
  return (
    <View style={styles.fanRow} testID="shop-pack-preview">
      {cards.map((card, index) => {
        const scale = 1 + index * FAN_SCALE_STEP;
        const width = Math.round(FAN_BASE_WIDTH * scale * fit);
        const height = Math.round(FAN_BASE_HEIGHT * scale * fit);
        const rotate = (index - (count - 1) / 2) * 5.5;
        return (
          <View
            key={card.key}
            style={[
              styles.fanCard,
              {
                width,
                height,
                marginLeft: index === 0 ? 0 : -Math.round(width * FAN_OVERLAP),
                zIndex: index,
                elevation: 6 + index * 4,
                borderRadius: 8 + index,
                shadowOpacity: 0.28 + index * 0.09,
                shadowRadius: 8 + index * 3,
                shadowOffset: { width: index, height: 4 + index * 3 },
                transform: [{ rotate: `${rotate}deg` }],
              },
            ]}
          >
            <Image source={card.source ?? undefined} style={styles.fanImage} contentFit="contain" />
          </View>
        );
      })}
    </View>
  );
}

function ArenaPortrait({ id }: { id: ArenaId }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const frameW = Math.max(300, Math.min(420, width - insets.left - insets.right - 380));
  const frameH = Math.max(200, Math.min(height - insets.top - 96, Math.round(frameW * 0.7)));
  return (
    <View testID="shop-arena-hero">
      <OrnateGoldFrame width={frameW} height={frameH}>
        <Image
          source={ARENA_IMAGES[id]}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={arenaName(id)}
        />
      </OrnateGoldFrame>
    </View>
  );
}

function DetailStage({
  hero,
  title,
  body,
  state,
  titleFont,
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
  state: StoreItemState;
  titleFont?: string;
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
        <View style={styles.glassShell}>
          <BlurView intensity={62} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(12, 8, 20, 0.42)', 'rgba(6, 4, 12, 0.62)']}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255, 248, 220, 0.22)', 'rgba(240, 215, 140, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.85 }}
            style={styles.glassSheen}
          />
          <View style={styles.glassInner}>
            <Text style={[styles.detailName, titleFont ? { fontFamily: titleFont } : null]}>{title}</Text>
            <Text style={[styles.detailBody, titleFont ? { fontFamily: titleFont } : null]}>{body}</Text>
            {state.showPrice && state.priceLabel ? (
              <Text style={[styles.detailPrice, titleFont ? { fontFamily: titleFont } : null]}>{state.priceLabel}</Text>
            ) : null}
            <View style={styles.glassAction}>
              <ShopGoldButton label={busy ? 'Please wait…' : state.actionLabel} disabled={disabled} onPress={onPress} />
            </View>
            {notice ? <Text style={[styles.notice, noticeTone === 'error' && styles.noticeError]}>{notice}</Text> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07000f' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2, 10, 6, 0.38)' },
  feltShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.12)' },
  header: { paddingBottom: 4 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleBlock: { flex: 1, flexShrink: 1, minWidth: 0 },
  backLabel: { color: '#f0d78c', letterSpacing: 1.4 },
  kicker: {
    color: '#7ee7ff',
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8e7a2',
    fontSize: 28,
    letterSpacing: 0.6,
    textShadowColor: 'rgba(255, 215, 0, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  taglineBanner: {
    marginTop: 6,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 74, 0.92)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  taglineWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  subtitle: {
    color: '#FFD54A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.15,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
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
  tabText: { color: '#b7a8cf', fontSize: 13 },
  tabTextActive: { color: '#f8e7a2' },
  body: { flex: 1, minHeight: 0 },
  gridScroll: { alignItems: 'flex-start', paddingRight: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignContent: 'flex-start' },
  gridFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 },
  frameShadow: {
    shadowColor: '#e0b03a',
    shadowOpacity: 0.55,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  frameShadowEquipped: { shadowOpacity: 0.95, shadowRadius: 16 },
  bezel: { flex: 1, borderRadius: 14, padding: 4 },
  bezelGroove: {
    flex: 1,
    borderRadius: 10,
    padding: 1.5,
    backgroundColor: '#3a2508',
  },
  artWell: { flex: 1, borderRadius: 8, overflow: 'hidden', backgroundColor: '#12081c' },
  innerGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 236, 180, 0.55)',
    borderRadius: 8,
  },
  flourish: { position: 'absolute', width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  flourishTL: { top: 1, left: 1 },
  flourishTR: { top: 1, right: 1 },
  flourishBL: { bottom: 1, left: 1 },
  flourishBR: { bottom: 1, right: 1 },
  flourishGem: {
    width: 8,
    height: 8,
    backgroundColor: '#f8e7a2',
    borderWidth: 1,
    borderColor: '#fff6d2',
    transform: [{ rotate: '45deg' }],
  },
  flourishSpark: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  tileArtFill: { ...StyleSheet.absoluteFillObject },
  titleWash: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingTop: 18,
    paddingBottom: 7,
  },
  lockBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
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
  tileName: {
    color: '#f8e7a2',
    fontSize: 15,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tilePrice: { color: '#fff6d2', fontSize: 12, fontWeight: '800', marginTop: 1 },
  tileSoon: { color: '#e7d7ef', fontSize: 11, marginTop: 1 },
  tileOwnedCaption: { color: '#7ee7ff', fontSize: 11, fontWeight: '700', marginTop: 1 },
  notice: { color: '#f0d78c', fontSize: 13, flex: 1 },
  noticeError: { color: '#ff8aa0' },
  restoreBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  restoreText: { color: '#7ee7ff', fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  detailRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 0 },
  heroSlot: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  copyPanel: { width: 286, justifyContent: 'center' },
  glassShell: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(240, 215, 140, 0.78)',
    backgroundColor: 'rgba(8, 6, 16, 0.28)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  glassSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 54 },
  glassInner: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },
  glassAction: { marginTop: 12 },
  fanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 250,
    overflow: 'visible',
  },
  fanCard: {
    overflow: 'hidden',
    backgroundColor: '#140818',
    borderWidth: 1,
    borderColor: 'rgba(240, 215, 140, 0.72)',
    shadowColor: '#1a0a04',
  },
  fanImage: { width: '100%', height: '100%' },
  detailName: {
    color: '#fff8e4',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  detailBody: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  detailPrice: {
    color: '#ffe27a',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 10,
  },
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
