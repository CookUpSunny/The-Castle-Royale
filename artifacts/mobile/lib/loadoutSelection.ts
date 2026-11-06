import { type AvatarId, sanitizeAvatarId } from './avatarPortrait';
import { CARD_SKINS, canEquipCardSkin, resolveStoredCardSkin, type CardSkinId } from './cardSkins';

export const ARENA_IDS = [
  'greenTable',
  'classic',
  'cosmic',
  'royal',
  'lightning',
  'matrix',
  'rainbowRoad',
] as const;

export type ArenaId = (typeof ARENA_IDS)[number];

const ARENA_ID_SET = new Set<string>(ARENA_IDS);

export function sanitizeArenaId(value: unknown): ArenaId | undefined {
  if (typeof value !== 'string') return undefined;
  return ARENA_ID_SET.has(value) ? (value as ArenaId) : undefined;
}

/**
 * Storage hydration must not clobber a character or arena the player already
 * confirmed while AsyncStorage was still in flight.
 */
export function valueAfterHydration<T extends string>(opts: {
  dirty: boolean;
  current: T;
  stored: unknown;
  sanitize: (value: unknown) => T | undefined;
}): T {
  if (opts.dirty) return opts.current;
  return opts.sanitize(opts.stored) ?? opts.current;
}

export function avatarAfterHydration(opts: {
  dirty: boolean;
  current: AvatarId;
  stored: unknown;
}): AvatarId {
  return valueAfterHydration({ ...opts, sanitize: sanitizeAvatarId });
}

export function arenaAfterHydration(opts: {
  dirty: boolean;
  current: ArenaId;
  stored: unknown;
}): ArenaId {
  return valueAfterHydration({ ...opts, sanitize: sanitizeArenaId });
}

/**
 * Skins the pre-match row may offer.
 * Unlocked procedural skins and the eight preview-unlocked image backs are
 * included for every player. Locked procedural skins stay subscriber-only.
 */
export function equippableCardSkins(isSubscribed: boolean): CardSkinId[] {
  return CARD_SKINS.filter((skin) => canEquipCardSkin(skin.id, isSubscribed)).map((skin) => skin.id);
}

/**
 * Apply a stored card back without clobbering a choice made before hydration.
 * Locked and unknown ids stay on the current skin and are not written back.
 * A legacy id migrates only when the registry says its replacement is unlocked.
 */
export function cardAfterHydration(opts: {
  dirty: boolean;
  current: CardSkinId;
  stored: unknown;
}): { skin: CardSkinId; migrate: boolean } {
  if (opts.dirty || typeof opts.stored !== 'string' || opts.stored.length === 0) {
    return { skin: opts.current, migrate: false };
  }
  const resolved = resolveStoredCardSkin(opts.stored);
  if (resolved.migrate) return resolved;
  if (resolved.skin !== 'royal-gold' || opts.stored === 'royal-gold') return resolved;
  return { skin: opts.current, migrate: false };
}

export interface LoadoutConfirmInput {
  hydrated: boolean;
  storedAvatar: AvatarId;
  storedArena: ArenaId;
  storedCard: CardSkinId;
  avatarOverride: AvatarId | null;
  arenaOverride: ArenaId | null;
  cardOverride: CardSkinId | null;
}

export interface ConfirmedLoadout {
  avatar: AvatarId;
  arena: ArenaId;
  card: CardSkinId;
  /** Sent on the seat socket payload. Always this player's committed character. */
  seatAvatarId: AvatarId;
}

/**
 * Commit the loadout the player is actually looking at.
 * Returns null when confirming now would persist the pre-hydration defaults
 * (`eagles` / `greenTable` / `royal-gold`) over a saved character, arena, or
 * card back. An explicit override may commit before hydration; any field the
 * player has not touched still waits.
 */
export function confirmLoadout(input: LoadoutConfirmInput): ConfirmedLoadout | null {
  const avatarReady = input.hydrated || input.avatarOverride !== null;
  const arenaReady = input.hydrated || input.arenaOverride !== null;
  const cardReady = input.hydrated || input.cardOverride !== null;
  if (!avatarReady || !arenaReady || !cardReady) return null;
  const avatar = input.avatarOverride ?? input.storedAvatar;
  const arena = input.arenaOverride ?? input.storedArena;
  const card = input.cardOverride ?? input.storedCard;
  return { avatar, arena, card, seatAvatarId: avatar };
}

/** Highlight follows an explicit tap, otherwise the equipped (hydrated) value. */
export function shownLoadout(input: LoadoutConfirmInput): {
  avatar: AvatarId;
  arena: ArenaId;
  card: CardSkinId;
} {
  return {
    avatar: input.avatarOverride ?? input.storedAvatar,
    arena: input.arenaOverride ?? input.storedArena,
    card: input.cardOverride ?? input.storedCard,
  };
}
