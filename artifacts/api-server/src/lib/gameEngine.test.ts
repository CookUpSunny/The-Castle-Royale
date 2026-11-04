import assert from 'node:assert/strict';
import test from 'node:test';

import { playCards, playerIsOut, type Card, type GameState, type PlayerState } from './gameEngine.js';

function card(id: string, value: number, suit: Card['suit'] = 'C'): Card {
  return { id, value, suit };
}

function player(id: string, hand: Card[], faceUp: Card[] = [], faceDown: Card[] = []): PlayerState {
  return { id, name: id, hand, faceUp, faceDown };
}

function playing(opts: {
  hand: Card[];
  faceUp?: Card[];
  faceDown?: Card[];
  deck?: Card[];
  pile?: Card[];
  mustPlayStarter?: boolean;
}): GameState {
  const me = player('me', opts.hand, opts.faceUp ?? [], opts.faceDown ?? []);
  const opp = player('opp', [card('OH7', 7)], [card('OU8', 8)], [card('OD9', 9)]);
  return {
    gameId: 'g',
    players: { me, opp },
    playerOrder: ['me', 'opp'],
    deck: opts.deck ?? [],
    discardPile: opts.pile ?? [],
    currentPlayerId: 'me',
    phase: 'playing',
    setupReady: { me: true, opp: true },
    mustPlayStarter: opts.mustPlayStarter ? 'me' : undefined,
  };
}

function played(state: GameState, cardIds: string[]) {
  const outcome = playCards(state, 'me', cardIds);
  if ('error' in outcome) assert.fail(outcome.error);
  return outcome;
}

test('clearing the hand does not end the match while face-up or face-down remain', () => {
  const outcome = played(
    playing({
      hand: [card('H4', 4)],
      faceUp: [card('HQ', 12), card('HT', 10, 'S')],
      faceDown: [card('FD3', 3)],
    }),
    ['H4'],
  );
  assert.equal(outcome.result.gameOver, false);
  assert.equal(outcome.newState.phase, 'playing');
  assert.equal(outcome.newState.winner, undefined);
  assert.equal(outcome.newState.players.me!.faceUp.length, 2);
  assert.equal(outcome.newState.players.me!.faceDown.length, 1);
});

test('clearing the hand draws from the deck instead of ending the match', () => {
  const outcome = played(
    playing({
      hand: [card('H4', 4)],
      deck: [card('D5', 5), card('D6', 6), card('D7', 7), card('D8', 8)],
    }),
    ['H4'],
  );
  assert.equal(outcome.result.gameOver, false);
  assert.equal(outcome.newState.phase, 'playing');
  assert.equal(outcome.newState.players.me!.hand.length, 3);
  assert.equal(outcome.newState.deck.length, 1);
});

test('clearing face-up does not end the match while face-down cards remain', () => {
  const outcome = played(
    playing({
      hand: [],
      faceUp: [card('HQ', 12)],
      faceDown: [card('FD3', 3), card('FD4', 4)],
      pile: [card('P5', 5)],
    }),
    ['HQ'],
  );
  assert.equal(outcome.result.gameOver, false);
  assert.equal(outcome.newState.phase, 'playing');
  assert.equal(outcome.newState.players.me!.faceDown.length, 2);
});

test('playing one face-down card leaves the rest in play', () => {
  const outcome = played(
    playing({
      hand: [],
      faceDown: [card('FD6', 6), card('FD9', 9)],
      pile: [card('P5', 5)],
    }),
    ['FD6'],
  );
  assert.equal(outcome.result.gameOver, false);
  assert.equal(outcome.newState.players.me!.faceDown.length, 1);
  assert.equal(outcome.newState.phase, 'playing');
});

test('the match ends only when the last face-down card is played and the deck is empty', () => {
  const outcome = played(
    playing({
      hand: [],
      faceDown: [card('FD8', 8)],
      pile: [card('P5', 5)],
    }),
    ['FD8'],
  );
  assert.equal(outcome.result.gameOver, true);
  assert.equal(outcome.newState.phase, 'finished');
  assert.equal(outcome.newState.winner, 'me');
  assert.equal(outcome.newState.players.opp!.hand.length, 1);
  assert.equal(outcome.newState.deck.length, 0);
});

test('the last face-down card does not win while the draw deck still has cards', () => {
  const outcome = played(
    playing({
      hand: [],
      faceDown: [card('FD8', 8)],
      pile: [card('P4', 4)],
      deck: [card('D5', 5), card('D6', 6)],
    }),
    ['FD8'],
  );
  assert.equal(outcome.result.gameOver, false);
  assert.equal(outcome.newState.phase, 'playing');
  assert.equal(outcome.newState.players.me!.hand.length, 2);
  assert.equal(outcome.newState.deck.length, 0);
  assert.equal(outcome.newState.players.me!.faceDown.length, 0);
});

test('a face-down bust is not a win', () => {
  const outcome = played(
    playing({
      hand: [],
      faceDown: [card('FD3', 3)],
      pile: [card('PK', 13)],
    }),
    ['FD3'],
  );
  assert.equal(outcome.result.gameOver, false);
  assert.equal(outcome.result.effect, 'face_down_bust');
  assert.equal(outcome.newState.phase, 'playing');
  assert.ok(outcome.newState.players.me!.hand.length > 0);
});

test('a starter play of the last hand card does not end the match while face-down remains', () => {
  const outcome = played(
    playing({
      hand: [card('H3', 3)],
      faceDown: [card('FD9', 9)],
      pile: [card('P10', 10)],
      mustPlayStarter: true,
    }),
    ['H3'],
  );
  assert.equal(outcome.result.gameOver, false);
  assert.equal(outcome.newState.phase, 'playing');
  assert.equal(outcome.newState.players.me!.faceDown.length, 1);
});

test('burning the final card wins only when every zone and the deck are empty', () => {
  const win = played(playing({ hand: [card('HT', 10)], pile: [card('PA', 14)] }), ['HT']);
  assert.equal(win.result.gameOver, true);
  assert.equal(win.newState.phase, 'finished');
  assert.equal(win.newState.discardPile.length, 0);

  const stillDrawing = played(
    playing({
      hand: [card('HT', 10)],
      pile: [card('PA', 14)],
      deck: [card('D4', 4)],
    }),
    ['HT'],
  );
  assert.equal(stillDrawing.result.gameOver, false);
  assert.equal(stillDrawing.newState.players.me!.hand.length, 1);
});

test('playerIsOut refills from the deck before it will call a player out', () => {
  const owed = playing({
    hand: [],
    faceUp: [card('FQ', 12)],
    faceDown: [card('FD4', 4)],
    deck: [card('D2', 2)],
  });
  assert.equal(playerIsOut(owed, 'me'), false);
  assert.equal(owed.players.me!.hand.length, 1);
  assert.equal(owed.players.me!.faceUp.length, 1);
  assert.equal(owed.players.me!.faceDown.length, 1);
  assert.equal(owed.deck.length, 0);

  const out = playing({ hand: [], deck: [] });
  assert.equal(playerIsOut(out, 'me'), true);
});
