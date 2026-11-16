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
  /** Cosmetic line shown in the shop. Not a rule change. */
  blurb: string;
}

export const SHOP_ARENA_CATALOG: readonly ShopArenaEntry[] = [
  {
    id: 'greenTable',
    blurb: 'A green and gold table. Light turns under the cards while you play.',
  },
  {
    id: 'classic',
    blurb: 'Pink neon and flamingo silhouettes around a gold rail. A cosmetic floor for your table.',
  },
  {
    id: 'cosmic',
    blurb: 'The Cosmic Sanctum sky, as it plays in a match: deep space, crystals, and a quiet glow behind the cards.',
  },
  {
    id: 'royal',
    blurb: 'Marble columns and warm gold light above the clouds. A cosmetic throne-room table.',
  },
  {
    id: 'lightning',
    blurb: 'Waterfalls, lanterns, and blossom color inside a quiet cave. A cosmetic oasis table.',
  },
  {
    id: 'matrix',
    blurb: 'Falling green characters over a dark glass table. A cosmetic digital arena.',
  },
  {
    id: 'rainbowRoad',
    blurb: 'A glittering road of color through a starfield. A cosmetic table for your matches.',
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
