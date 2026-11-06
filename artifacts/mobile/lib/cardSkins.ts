/**
 * Card-back registry.
 *
 * The original 10 procedural skins keep their free / subscription flags.
 * The eight image backs are `unlocked: true` so they can be equipped and
 * previewed before separate purchase ownership exists. That flag is a
 * preview state only — it does not add a product, a price, or a paywall.
 */

export type ProceduralCardSkinId =
  | 'neon-glow'
  | 'royal-gold'
  | 'crystal-ice'
  | 'sakura-blossom'
  | 'inferno-flame'
  | 'midnight-void'
  | 'emerald-prestige'
  | 'pearl-white'
  | 'cyber-punk'
  | 'vintage-casino';

export const IMAGE_CARD_BACKS = [
  { id: 'atlas-red', name: 'Atlas Red', file: 'atlas-red.png', unlocked: true, description: 'A crowned jet and red chevron on a gilded night sky' },
  { id: 'castle-cards', name: 'Castle Cards', file: 'castle-cards.png', unlocked: true, description: 'A cliffside castle with playing cards falling through the clouds' },
  { id: 'queens-hand', name: 'Queen\u2019s Hand', file: 'queens-hand.png', unlocked: true, description: 'A jeweled hand resting over gold coins on crimson velvet' },
  { id: 'coat-of-arms', name: 'Coat of Arms', file: 'coat-of-arms.png', unlocked: true, description: 'A crowned shield flanked by golden lions' },
  { id: 'big-winner', name: 'Big Winner', file: 'big-winner.png', unlocked: true, description: 'A crowned burst of gold, gems, and chips' },
  { id: 'lady-luck', name: 'Lady Luck', file: 'lady-luck.png', unlocked: true, description: 'A lady in red holding a four-leaf clover' },
  { id: 'gold-obsession', name: 'Gold Obsession', file: 'gold-obsession.png', unlocked: true, description: 'Crowns, keys, and coins laid on green velvet' },
  { id: 'royal-treasure-crest', name: 'Royal Treasure Crest', file: 'royal-treasure-crest.png', unlocked: true, description: 'An emerald crest crowned in gold among coins and jewels' },
] as const;

export type ImageCardSkinId = (typeof IMAGE_CARD_BACKS)[number]['id'];

export type CardSkinId = ProceduralCardSkinId | ImageCardSkinId;

export interface CardSkin {
  id: CardSkinId;
  name: string;
  /** True when every player can equip this skin for free. False = premium (requires an active subscription). */
  unlocked: boolean;
  description: string;
}

export const CARD_SKINS: CardSkin[] = [
  { id: 'neon-glow',       name: 'Neon Glow',        unlocked: true,  description: 'Futuristic neon lights with vibrant electric glow' },
  { id: 'royal-gold',      name: 'Royal Gold',       unlocked: true,  description: 'Luxurious gold detailing with a royal casino feel' },
  { id: 'crystal-ice',     name: 'Crystal Ice',      unlocked: true,  description: 'Icy crystal texture with cool blue tones' },
  { id: 'sakura-blossom',  name: 'Sakura Blossom',   unlocked: true,  description: 'Elegant cherry blossoms with soft pink accents' },
  { id: 'inferno-flame',   name: 'Inferno Flame',    unlocked: true,  description: 'Fiery molten edges with intense heat and power' },
  { id: 'midnight-void',   name: 'Midnight Void',    unlocked: false, description: 'Dark cosmic theme with mystical purple energy' },
  { id: 'emerald-prestige',name: 'Emerald Prestige', unlocked: false, description: 'Rich emerald green with gold premium accents' },
  { id: 'pearl-white',     name: 'Pearl White',      unlocked: false, description: 'Clean pearl white with elegant minimalism' },
  { id: 'cyber-punk',      name: 'Cyber Punk',       unlocked: false, description: 'High-tech cyber design with neon cyber accents' },
  { id: 'vintage-casino',  name: 'Vintage Casino',   unlocked: false, description: 'Classic vintage look with aged casino charm' },
  ...IMAGE_CARD_BACKS.map((skin) => ({
    id: skin.id,
    name: skin.name,
    unlocked: skin.unlocked,
    description: skin.description,
  })),
];

const VALID_SKIN_IDS = new Set<CardSkinId>(CARD_SKINS.map((s) => s.id));
const UNLOCKED_SKIN_IDS = new Set<CardSkinId>(CARD_SKINS.filter((s) => s.unlocked).map((s) => s.id));
const IMAGE_SKIN_IDS = new Set<string>(IMAGE_CARD_BACKS.map((s) => s.id));

/** One-time migration of legacy stored skin IDs from the previous cosmetics revision. */
export const LEGACY_SKIN_MAP: Record<string, CardSkinId> = {
  classic: 'neon-glow',
  cosmic: 'midnight-void',
  royal: 'royal-gold',
};

export function isCardSkinId(value: string | null | undefined): value is CardSkinId {
  return !!value && VALID_SKIN_IDS.has(value as CardSkinId);
}

export function isImageCardSkinId(id: CardSkinId): id is ImageCardSkinId {
  return IMAGE_SKIN_IDS.has(id);
}

/** Free skins, and any skin when the caller has an active subscription. */
export function canEquipCardSkin(id: CardSkinId, isSubscribed = false): boolean {
  return UNLOCKED_SKIN_IDS.has(id) || isSubscribed;
}

/**
 * Skin to show for a stored id.
 * Locked and unknown ids stay on Royal Gold and are not written back.
 * A legacy id migrates only when its replacement is unlocked.
 */
export function resolveStoredCardSkin(stored: string | null): { skin: CardSkinId; migrate: boolean } {
  if (!stored) return { skin: 'royal-gold', migrate: false };
  const migrated = LEGACY_SKIN_MAP[stored];
  if (migrated && UNLOCKED_SKIN_IDS.has(migrated)) return { skin: migrated, migrate: true };
  if (VALID_SKIN_IDS.has(stored as CardSkinId) && UNLOCKED_SKIN_IDS.has(stored as CardSkinId)) {
    return { skin: stored as CardSkinId, migrate: false };
  }
  return { skin: 'royal-gold', migrate: false };
}
