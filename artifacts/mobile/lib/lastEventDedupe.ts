import type { GameView, LastEvent } from '@/contexts/GameContext';

/** Payload-only fingerprint for a logical `lastEvent` (fresh JSON per socket push). */
export function lastEventIdentityKey(gameId: string, ev: LastEvent): string {
  return [
    gameId,
    ev.playerId,
    ev.type,
    ev.card?.id ?? '',
    String(ev.playedCount ?? (ev.type === 'pickup' ? 0 : 1)),
    ev.wasFaceDown ? '1' : '0',
    ev.previousTop?.id ?? '',
  ].join('|');
}

/**
 * Stable id for one logical `lastEvent` while a given board state is current.
 * Every `game_update` is a fresh JSON parse, so `lastEvent` is a new object
 * reference even when the server echoes the same play; without a string key,
 * SFX/haptics would re-fire on every unrelated sync.
 *
 * We intentionally hash **event payload** fields only (plus `gameId`). Board
 * snapshots (`discardPile`, `deckCount`) were previously mixed in but can
 * drift between back-to-back payloads for the same play and caused duplicate
 * reactions; card ids in this game are unique per event.
 */
export function lastEventReactionKey(view: GameView, ev: LastEvent): string {
  return lastEventIdentityKey(view.gameId, ev);
}
