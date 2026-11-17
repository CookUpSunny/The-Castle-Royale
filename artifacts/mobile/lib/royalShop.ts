import { storeProductId } from '@workspace/monetization/client';
import { isArenaPremium } from '@/lib/arenaAccess';
import type { ArenaId } from '@/lib/loadoutSelection';

/**
 * Royal Shop catalog.
 *
 * Card packs and arenas are cosmetic. Free arenas stay free. Locked arenas
 * have no App Store product yet: leave productId and entitlementId unset and
 * the tile stays "Coming soon". Filling those two fields is enough for the
 * shop to sell the product RevenueCat returns. No other code change.
 *
 * Arena ids, in shop order:
 * greenTable, classic, cosmic, royal, lightning, matrix, rainbowRoad.
 * matrix and rainbowRoad are the locked tables.
 */
export interface ShopArenaEntry {
  id: ArenaId;
  /** Optional App Store product id. Absent until the product exists. */
  productId?: string;
  /** Optional RevenueCat entitlement. Absent until the product exists. */
  entitlementId?: string;
  /** The House, speaking in the shop. Cosmetic. Not a rule change. */
  blurb: string;
}

/** One line under Royal Shop. Bold title case. It must not wrap. */
export const SHOP_TAGLINE = 'Dress Your Table In Royal Splendor. The House Rules Never Change.';

/**
 * Shop voice for the Grandscape Mirror Pack.
 * The catalog description on the pack record stays the factual line.
 * App Store product notes are not this string.
 */
export const SHOP_PACK_BLURB =
  'The House set these faces in mirror and starlight. Perhaps a reflection will turn luck your way. The House makes no promises, but the mirrors have been known to wink at the lucky.';

export const SHOP_ARENA_CATALOG: readonly ShopArenaEntry[] = [
  {
    id: 'greenTable',
    blurb: 'The House has polished every inch of gold for you. Green marble, a crown, and chips that will not sit still. The rules never change, though the spotlight might.',
  },
  {
    id: 'classic',
    blurb: 'The House kept the pink lights burning for you. Flamingos pose along the gold rail and fully expect to be admired. The game is the same, and the floor is showing off.',
  },
  {
    id: 'cosmic',
    blurb: 'The House opened the sky and set this table in it for you. Crystals drift, and the stars are on their best behavior. The cards still answer to the rules, not the nebula.',
  },
  {
    id: 'royal',
    blurb: 'The House drew the clouds aside for you. Marble, warm gold, and a throne that is mostly theater. Sit like royalty; the deck is not impressed.',
  },
  {
    id: 'lightning',
    blurb: 'The House found you a cave with a waterfall and excellent manners. Lanterns and blossoms look after the pool. Only the scenery changes.',
  },
  {
    id: 'matrix',
    blurb: 'The House slipped you a seat beneath the green rain. The glass table is convinced those falling characters are classified. Your hand plays exactly as it always has.',
  },
  {
    id: 'rainbowRoad',
    blurb: 'The House unrolled a road of color and dared you to keep a straight face. Stars on one side, glitter on the other. The cards do not care how pretty the journey is.',
  },
];

export function shopArenaIds(): ArenaId[] {
  return SHOP_ARENA_CATALOG.map((entry) => entry.id);
}

export type StoreItemStatus = 'equipped' | 'owned' | 'locked' | 'unavailable';

export interface StoreItemStateInput {
  owned: boolean;
  equipped: boolean;
  /**
   * Live App Store priceString. Blank or missing means RevenueCat has no
   * sellable product, so the tile cannot be bought.
   */
  priceString?: string | null;
  /** Label used when the player already owns the item and it is not equipped. */
  ownedAction?: 'Select' | 'Equip';
}

export interface StoreItemState {
  status: StoreItemStatus;
  locked: boolean;
  showPrice: boolean;
  priceLabel: string | null;
  actionLabel: string;
  canPurchase: boolean;
  canSelect: boolean;
}

export function resolveStoreItemState(input: StoreItemStateInput): StoreItemState {
  const price = input.priceString?.trim() ?? '';
  const ownedAction = input.ownedAction ?? 'Select';
  if (input.owned && input.equipped) {
    return {
      status: 'equipped',
      locked: false,
      showPrice: false,
      priceLabel: null,
      actionLabel: 'Equipped',
      canPurchase: false,
      canSelect: false,
    };
  }
  if (input.owned) {
    return {
      status: 'owned',
      locked: false,
      showPrice: false,
      priceLabel: null,
      actionLabel: ownedAction,
      canPurchase: false,
      canSelect: true,
    };
  }
  if (price) {
    return {
      status: 'locked',
      locked: true,
      showPrice: true,
      priceLabel: price,
      actionLabel: `Buy ${price}`,
      canPurchase: true,
      canSelect: false,
    };
  }
  return {
    status: 'unavailable',
    locked: true,
    showPrice: false,
    priceLabel: null,
    actionLabel: 'Coming soon',
    canPurchase: false,
    canSelect: false,
  };
}

export function activeEntitlementIds(
  customerInfo: { entitlements?: { active?: object | null } | null } | null | undefined,
): string[] {
  const active = customerInfo?.entitlements?.active;
  if (!active) return [];
  return Object.keys(active);
}

export function arenaStoreInput(
  entry: ShopArenaEntry,
  opts: {
    equipped: boolean;
    isSubscribed: boolean;
    activeEntitlementIds: readonly string[];
    priceString?: string | null;
  },
): StoreItemStateInput {
  const premium = isArenaPremium(entry.id);
  const entitlementOwned = Boolean(
    entry.entitlementId && opts.activeEntitlementIds.includes(entry.entitlementId),
  );
  // Free tables stay free. A membership still opens the tables it already opens.
  // A future arena entitlement unlocks that one table on its own.
  const owned = !premium || entitlementOwned || opts.isSubscribed;
  return {
    owned,
    equipped: owned && opts.equipped,
    priceString: owned ? null : opts.priceString,
    ownedAction: 'Select',
  };
}

export function cardPackStoreInput(input: {
  owns: boolean;
  equipped: boolean;
  priceString?: string | null;
}): StoreItemStateInput {
  return {
    owned: input.owns,
    equipped: input.equipped,
    priceString: input.owns ? null : input.priceString,
    ownedAction: 'Equip',
  };
}

export interface ShopPackageLike {
  identifier?: string | null;
  product?: {
    identifier?: string | null;
    priceString?: string | null;
  } | null;
}

export interface ShopOfferingsLike<T> {
  current?: { availablePackages?: readonly T[] | null } | null;
  all?: Record<string, { availablePackages?: readonly T[] | null } | null | undefined> | null;
}

export interface PackageLookup {
  offeringId?: string;
  packageId?: string;
}

/**
 * A priced package for a product id. Prefers one offering and package id when
 * those are passed (the Grandscape offering uses this). A missing product, or
 * a product with no priceString, returns null.
 */
export function findPricedPackage<T extends ShopPackageLike>(
  offerings: ShopOfferingsLike<T> | null | undefined,
  productId: string | null | undefined,
  lookup?: PackageLookup,
): T | null {
  if (!offerings || !productId) return null;
  const want = storeProductId(productId);
  if (!want) return null;
  const lists: (readonly T[] | null | undefined)[] = [];
  if (lookup?.offeringId) {
    lists.push(offerings.all?.[lookup.offeringId]?.availablePackages);
  }
  lists.push(offerings.current?.availablePackages);
  for (const offering of Object.values(offerings.all ?? {})) {
    lists.push(offering?.availablePackages);
  }
  let fallback: T | null = null;
  const seen = new Set<string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const pkg of list) {
      const identifier = pkg?.product?.identifier ?? '';
      if (!identifier || storeProductId(identifier) !== want) continue;
      const price = pkg.product?.priceString?.trim() ?? '';
      if (!price) continue;
      if (lookup?.packageId && pkg.identifier === lookup.packageId) return pkg;
      const key = `${pkg.identifier ?? ''}::${identifier}::${price}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!fallback) fallback = pkg;
    }
  }
  return fallback;
}

/** Width of the soft alpha fade on each side of the arena carousel, in points. */
export const SHOP_CAROUSEL_FADE = 40;

/** Linear scale for a card-pack tile relative to an arena tile. Aspect stays 4:3. */
export const SHOP_PACK_SCALE = 1.7;

/**
 * Scroll-content inset so the first tile sits fully inside the fade at rest,
 * and also clears the landscape safe area (Dynamic Island).
 */
export function carouselContentInset(safeInset: number, fade = SHOP_CAROUSEL_FADE): number {
  const safe = Number.isFinite(safeInset) ? Math.max(0, safeInset) : 0;
  return Math.max(fade, safe);
}

/** Arena grid tile. Same 4:3 frame the shop already used. */
export function shopArenaTileSize(
  windowHeight: number,
  insetTop: number,
  insetBottom: number,
): { width: number; height: number } {
  const height = Math.max(112, Math.min(150, Math.floor((windowHeight - insetTop - insetBottom - 112) / 2)));
  return { width: Math.round(height * 4 / 3), height };
}

/**
 * Card-pack tiles, scaled up, then shrunk only enough to fit the stage.
 * A row of packs shares the width and stays the same aspect.
 */
export function shopPackTileSize(
  base: { width: number; height: number },
  bounds: { maxWidth: number; maxHeight: number },
  count = 1,
  gap = 16,
  scale = SHOP_PACK_SCALE,
): { width: number; height: number } {
  const safeCount = Math.max(1, Math.floor(count));
  const aspect = base.width / Math.max(1, base.height);
  let height = base.height * scale;
  let width = height * aspect;
  const maxH = Math.max(1, bounds.maxHeight);
  const maxW = Math.max(1, bounds.maxWidth);
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  const gaps = Math.max(0, safeCount - 1) * gap;
  if (safeCount * width + gaps > maxW) {
    width = Math.max(1, (maxW - gaps) / safeCount);
    height = width / aspect;
  }
  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height)),
  };
}
