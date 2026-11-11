import type { ArenaId } from './loadoutSelection';

/**
 * Which arenas a player may enter without a subscription.
 *
 * The free tables are Jackpot (`greenTable`, Casino Green's slot),
 * The Flamingo Floor (`classic`), and An Oasis in the Cave (`lightning`).
 * Cosmic Sanctum and Olympus Throne join that set. Matrix and Rainbow Road
 * stay subscription-only. This does not grant any other paid item.
 */
export const ARENA_PREMIUM: Record<ArenaId, boolean> = {
  greenTable: false,
  classic: false,
  cosmic: false,
  royal: false,
  lightning: false,
  matrix: true,
  rainbowRoad: true,
};

export function isArenaPremium(id: ArenaId): boolean {
  return ARENA_PREMIUM[id];
}

export function freeArenaIds(): ArenaId[] {
  return (Object.keys(ARENA_PREMIUM) as ArenaId[]).filter((id) => !ARENA_PREMIUM[id]);
}

/** New and existing players use the same gate. A saved free arena stays playable. */
export function canPlayArena(id: ArenaId, isSubscribed: boolean): boolean {
  return !isArenaPremium(id) || isSubscribed;
}
