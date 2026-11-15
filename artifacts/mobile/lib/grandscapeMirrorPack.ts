import {
  GRANDSCAPE_MIRROR_ENTITLEMENT_ID,
  GRANDSCAPE_MIRROR_PRODUCT_ID,
  storeProductId,
} from '@workspace/monetization/client';

/**
 * Grandscape Mirror Pack — the first purchasable card-face theme.
 *
 * Equipping it (after the RevenueCat entitlement is active) replaces the
 * player's view of card faces and uses the pack's matching card back.
 * Unequipping restores the standard faces and the selected card back.
 *
 * Playable art is the standard 52-card deck only. The crowned ace under
 * marketing/ is the shop thumbnail and is never a dealt face.
 */

export const GRANDSCAPE_MIRROR_PACK_ID = 'grandscape-mirror' as const;

export type CardFacePackId = typeof GRANDSCAPE_MIRROR_PACK_ID;

export { GRANDSCAPE_MIRROR_ENTITLEMENT_ID, GRANDSCAPE_MIRROR_PRODUCT_ID };

export const GRANDSCAPE_MIRROR_PACK = {
  id: GRANDSCAPE_MIRROR_PACK_ID,
  name: 'Grandscape Mirror Pack',
  productId: GRANDSCAPE_MIRROR_PRODUCT_ID,
  entitlementId: GRANDSCAPE_MIRROR_ENTITLEMENT_ID,
  /** Catalog price shown when the App Store has not returned a price string. */
  listPrice: '$4.99',
  description:
    'Illustrated faces for every card, plus the matching card back. One-time unlock. The standard deck stays until you equip this pack.',
} as const;

export const GRANDSCAPE_ASSET_ROOT = 'assets/cardpacks/grandscape-mirror';

export const GRANDSCAPE_SUIT_FOLDERS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
export const GRANDSCAPE_RANK_FILES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type GrandscapeSuitFolder = (typeof GRANDSCAPE_SUIT_FOLDERS)[number];
export type GrandscapeRankFile = (typeof GRANDSCAPE_RANK_FILES)[number];

/** Relative paths of the 52 playable faces. Marketing art is not in this list. */
export const GRANDSCAPE_PLAYABLE_FACE_FILES: readonly string[] = GRANDSCAPE_SUIT_FOLDERS.flatMap((suit) =>
  GRANDSCAPE_RANK_FILES.map((rank) => `${suit}/${rank}.webp`),
);

/** Matching card back. Used only while the pack is equipped. */
export const GRANDSCAPE_CARD_BACK_FILE = 'cardback.webp';

/**
 * Shop thumbnail and promo art. Never dealt, never used as a card face,
 * never used as the card back.
 */
export const GRANDSCAPE_MARKETING_FILE = 'marketing/ace_of_spades_crown.webp';

const SUIT_FOLDER: Record<string, GrandscapeSuitFolder> = {
  S: 'spades',
  H: 'hearts',
  C: 'clubs',
  D: 'diamonds',
};

const PLAYABLE_FACE_SET = new Set<string>(GRANDSCAPE_PLAYABLE_FACE_FILES);

export function grandscapeRankFile(value: number): GrandscapeRankFile | null {
  if (value === 1 || value === 14) return 'A';
  if (value >= 2 && value <= 10) return String(value) as GrandscapeRankFile;
  if (value === 11) return 'J';
  if (value === 12) return 'Q';
  if (value === 13) return 'K';
  return null;
}

/**
 * Playable face file for a game card, or null when the card is not in the
 * standard deck. The marketing crown is not a fallback for the ace of spades.
 */
export function grandscapePlayableFaceFile(card: { suit: string; value: number }): string | null {
  const folder = SUIT_FOLDER[card.suit];
  const rank = grandscapeRankFile(card.value);
  if (!folder || !rank) return null;
  const file = `${folder}/${rank}.webp`;
  if (!PLAYABLE_FACE_SET.has(file)) return null;
  if (file === GRANDSCAPE_MARKETING_FILE || file === GRANDSCAPE_CARD_BACK_FILE) return null;
  return file;
}

export function isGrandscapePlayableFaceFile(file: string): boolean {
  return PLAYABLE_FACE_SET.has(file);
}

/** A few playable faces for the shop row. The crowned marketing ace is not one of them. */
export const GRANDSCAPE_SHOP_PREVIEW_CARDS = [
  { suit: 'S', value: 14 },
  { suit: 'H', value: 13 },
  { suit: 'D', value: 12 },
  { suit: 'C', value: 10 },
] as const;

export function grandscapeExpectedAssetFiles(): { file: string; role: 'face' | 'back' | 'marketing' }[] {
  return [
    ...GRANDSCAPE_PLAYABLE_FACE_FILES.map((file) => ({ file, role: 'face' as const })),
    { file: GRANDSCAPE_CARD_BACK_FILE, role: 'back' as const },
    { file: GRANDSCAPE_MARKETING_FILE, role: 'marketing' as const },
  ];
}

export function ownsGrandscapeMirrorPack(
  customerInfo: { entitlements?: { active?: Record<string, unknown> | null } | null } | null | undefined,
): boolean {
  return customerInfo?.entitlements?.active?.[GRANDSCAPE_MIRROR_ENTITLEMENT_ID] !== undefined;
}

/** The pack paints only when it is the saved choice and the entitlement is active. */
export function activeCardFacePack(equipped: CardFacePackId | null, owns: boolean): CardFacePackId | null {
  if (!owns) return null;
  return equipped === GRANDSCAPE_MIRROR_PACK_ID ? GRANDSCAPE_MIRROR_PACK_ID : null;
}

export function cardFacePackAfterHydration(opts: {
  dirty: boolean;
  current: CardFacePackId | null;
  stored: unknown;
}): CardFacePackId | null {
  if (opts.dirty) return opts.current;
  if (opts.stored === GRANDSCAPE_MIRROR_PACK_ID) return GRANDSCAPE_MIRROR_PACK_ID;
  return null;
}

export interface GrandscapePackageLike {
  product?: {
    identifier?: string | null;
    priceString?: string | null;
  } | null;
}

export interface GrandscapeOfferingsLike<T> {
  current?: { availablePackages?: readonly T[] | null } | null;
  all?: Record<string, { availablePackages?: readonly T[] | null } | null | undefined> | null;
}

/**
 * The sellable Grandscape package from any offering.
 * A missing product, or a product with no store price, returns null so the
 * shop can show the row as unavailable instead of throwing.
 */
export function findGrandscapePackage<T extends GrandscapePackageLike>(
  offerings: GrandscapeOfferingsLike<T> | null | undefined,
): T | null {
  if (!offerings) return null;
  const lists = [
    offerings.current?.availablePackages,
    ...Object.values(offerings.all ?? {}).map((offering) => offering?.availablePackages),
  ];
  const seen = new Set<string>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const pkg of list) {
      const identifier = pkg?.product?.identifier ?? '';
      if (!identifier || seen.has(identifier)) continue;
      if (storeProductId(identifier) !== GRANDSCAPE_MIRROR_PRODUCT_ID) {
        seen.add(identifier);
        continue;
      }
      const price = pkg.product?.priceString?.trim() ?? '';
      if (!price) continue;
      seen.add(identifier);
      return pkg;
    }
  }
  return null;
}

export type GrandscapeShopStatus = 'equipped' | 'owned' | 'available' | 'unavailable';

export interface GrandscapeShopView {
  status: GrandscapeShopStatus;
  priceLabel: string;
  actionLabel: string;
  canPurchase: boolean;
  canEquip: boolean;
  canUnequip: boolean;
}

export function grandscapeShopView(input: {
  owns: boolean;
  equipped: boolean;
  priceString: string | null | undefined;
}): GrandscapeShopView {
  const live = input.priceString?.trim() ?? '';
  const priceLabel = live || GRANDSCAPE_MIRROR_PACK.listPrice;
  if (input.owns && input.equipped) {
    return {
      status: 'equipped',
      priceLabel,
      actionLabel: 'Unequip',
      canPurchase: false,
      canEquip: false,
      canUnequip: true,
    };
  }
  if (input.owns) {
    return {
      status: 'owned',
      priceLabel,
      actionLabel: 'Equip',
      canPurchase: false,
      canEquip: true,
      canUnequip: false,
    };
  }
  if (live) {
    return {
      status: 'available',
      priceLabel: live,
      actionLabel: `Buy ${live}`,
      canPurchase: true,
      canEquip: false,
      canUnequip: false,
    };
  }
  return {
    status: 'unavailable',
    priceLabel,
    actionLabel: 'Unavailable',
    canPurchase: false,
    canEquip: false,
    canUnequip: false,
  };
}

export function isStorePurchaseCancelled(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { userCancelled?: unknown; code?: unknown; message?: unknown };
  if (record.userCancelled === true) return true;
  const code = typeof record.code === 'string' || typeof record.code === 'number' ? String(record.code) : '';
  if (code === '1' || code === 'PurchaseCancelledError') return true;
  const message = typeof record.message === 'string' ? record.message : '';
  return message.toLowerCase().includes('cancel');
}
