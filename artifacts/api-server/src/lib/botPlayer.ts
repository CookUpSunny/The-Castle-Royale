import { canPlayCard, type Card, type GameState } from './gameEngine.js';

export interface BotMove {
  action: 'play' | 'pickup';
  cardIds?: string[];
}

const BOT_NAMES = ['Akira', 'Yuki', 'Ren', 'Hina', 'Saber', 'Kaito', 'Sora', 'Kira'];

export function randomBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]!;
}

export function isBotId(id: string): boolean {
  return id.startsWith('bot_');
}

export function newBotId(): string {
  return `bot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * During the setup phase, the bot wants its STRONGEST cards in the face-up
 * castle row (those are played second, after the hand is exhausted, and need
 * to handle a high pile). Strategy: rank all 6 of its hand+faceUp cards by
 * face-up desirability, ensure the top 3 are face-up via minimal swaps.
 *
 * Returns a list of swap operations to apply in order.
 */
export function pickBotSetupSwaps(
  state: GameState,
  botId: string,
): { handCardId: string; faceUpCardId: string }[] {
  const player = state.players[botId];
  if (!player) return [];

  // Higher score = more desirable to keep face-up.
  // 10 (burn) and 2 (wild) are exceptionally valuable face-up because they
  // always play regardless of pile state.
  const score = (c: Card): number => {
    if (c.value === 10) return 100;
    if (c.value === 2) return 90;
    return c.value;
  };

  const swaps: { handCardId: string; faceUpCardId: string }[] = [];
  const hand = [...player.hand];
  const faceUp = [...player.faceUp];

  // Repeatedly: find weakest face-up card and strongest hand card; if the
  // hand card is strictly stronger, swap them. Stop when no improvement.
  while (true) {
    let weakestFaceUpIdx = 0;
    for (let i = 1; i < faceUp.length; i++) {
      if (score(faceUp[i]!) < score(faceUp[weakestFaceUpIdx]!)) weakestFaceUpIdx = i;
    }
    let strongestHandIdx = 0;
    for (let i = 1; i < hand.length; i++) {
      if (score(hand[i]!) > score(hand[strongestHandIdx]!)) strongestHandIdx = i;
    }
    if (faceUp.length === 0 || hand.length === 0) break;
    if (score(hand[strongestHandIdx]!) <= score(faceUp[weakestFaceUpIdx]!)) break;

    swaps.push({
      handCardId: hand[strongestHandIdx]!.id,
      faceUpCardId: faceUp[weakestFaceUpIdx]!.id,
    });
    const tmp = hand[strongestHandIdx]!;
    hand[strongestHandIdx] = faceUp[weakestFaceUpIdx]!;
    faceUp[weakestFaceUpIdx] = tmp;
  }

  return swaps;
}

export function pickBotMove(state: GameState, botId: string): BotMove {
  const player = state.players[botId];
  if (!player) return { action: 'pickup' };

  // Starter mode: bot just picked up and must commit any single card to
  // restart the pile. Sacrifice the lowest non-special card; fall back to
  // the lowest overall card if it only holds 2s/10s.
  if (state.mustPlayStarter === botId) {
    const zone = player.hand.length > 0
      ? player.hand
      : player.faceUp.length > 0
      ? player.faceUp
      : player.faceDown;
    if (zone.length === 0) return { action: 'pickup' };
    const sorted = [...zone].sort((a, b) => a.value - b.value);
    const nonSpecial = sorted.find((c) => c.value !== 2 && c.value !== 10);
    const choice = nonSpecial ?? sorted[0]!;
    return { action: 'play', cardIds: [choice.id] };
  }

  const pile = state.discardPile;

  let accessible: Card[] = [];
  let fromFaceDown = false;

  if (player.hand.length > 0) {
    accessible = player.hand;
  } else if (player.faceUp.length > 0) {
    accessible = player.faceUp;
  } else if (player.faceDown.length > 0) {
    fromFaceDown = true;
    accessible = player.faceDown;
  } else {
    return { action: 'pickup' };
  }

  if (fromFaceDown) {
    // Face-down values are unknown — pick a single random card.
    const pick = accessible[Math.floor(Math.random() * accessible.length)]!;
    return { action: 'play', cardIds: [pick.id] };
  }

  const playable = accessible.filter((c) => canPlayCard(c, pile));

  if (playable.length === 0) {
    return { action: 'pickup' };
  }

  // Helper: gather every card in the accessible zone matching a given value
  const allOfValue = (v: number): string[] => accessible.filter((c) => c.value === v).map((c) => c.id);

  const nonSpecial = playable.filter((c) => c.value !== 2 && c.value !== 10);
  if (nonSpecial.length > 0) {
    nonSpecial.sort((a, b) => a.value - b.value);
    const chosenValue = nonSpecial[0]!.value;
    return { action: 'play', cardIds: allOfValue(chosenValue) };
  }

  const tens = playable.filter((c) => c.value === 10);
  const twos = playable.filter((c) => c.value === 2);

  if (tens.length > 0 && pile.length >= 2) {
    return { action: 'play', cardIds: allOfValue(10) };
  }
  if (twos.length > 0) {
    return { action: 'play', cardIds: allOfValue(2) };
  }
  if (tens.length > 0) {
    return { action: 'play', cardIds: allOfValue(10) };
  }

  return { action: 'play', cardIds: [playable[0]!.id] };
}
