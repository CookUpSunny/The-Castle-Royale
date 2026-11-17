import type { LastEvent } from '@/contexts/GameContext';

/** Ghost stays on the pile until the server answers, then this long at most. */
export const THROW_SAFETY_MS = 1200;

export function fanCardCenter(
  containerX: number,
  containerY: number,
  left: number,
  top: number,
  cardWidth = 66,
  cardHeight = 100,
): { x: number; y: number } {
  return {
    x: containerX + left + cardWidth / 2,
    y: containerY + top + cardHeight / 2,
  };
}

/** The server accepted this exact card from the local player. */
export function throwLanded(
  event: LastEvent | undefined,
  myPlayerId: string,
  cardId: string,
): boolean {
  if (!event?.card) return false;
  if (event.playerId !== myPlayerId) return false;
  if (event.card.id !== cardId) return false;
  if (event.type === 'pickup') return false;
  return true;
}

/**
 * After the safety window: land if the card has left the hand or the event
 * arrived, otherwise the throw failed and the ghost springs home.
 */
export function pendingThrowOutcome(input: {
  landed: boolean;
  cardStillInHand: boolean;
}): 'land' | 'reject' {
  if (input.landed) return 'land';
  if (input.cardStillInHand) return 'reject';
  return 'land';
}
