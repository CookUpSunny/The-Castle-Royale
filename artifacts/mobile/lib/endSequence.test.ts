import assert from 'node:assert/strict';
import test from 'node:test';

import { endSequenceDelayMs, isLegalMatchEnd } from './endSequence';

const clearMe = {
  phase: 'finished',
  winner: 'me',
  myPlayerId: 'me',
  myHand: [],
  myFaceUp: [],
  myFaceDownCount: 0,
  opponentHandCount: 2,
  opponentFaceUp: [{ id: 'x' }],
  opponentFaceDownCount: 3,
  deckCount: 0,
};

test('emptying the hand is not a win while other zones or the deck remain', () => {
  assert.equal(
    isLegalMatchEnd({ ...clearMe, myHand: [{ id: 'a' }] }),
    false,
  );
  assert.equal(
    isLegalMatchEnd({ ...clearMe, myFaceUp: [{ id: 'q' }] }),
    false,
  );
  assert.equal(isLegalMatchEnd({ ...clearMe, myFaceDownCount: 1 }), false);
  assert.equal(isLegalMatchEnd({ ...clearMe, deckCount: 4 }), false);
  assert.equal(isLegalMatchEnd({ ...clearMe, phase: 'playing' }), false);
  assert.equal(isLegalMatchEnd({ ...clearMe, winner: undefined }), false);
});

test('the winner may finish while the opponent still holds cards', () => {
  assert.equal(isLegalMatchEnd(clearMe), true);
});

test('a loss is legal only when the opponent is fully out and the deck is empty', () => {
  const loss = {
    ...clearMe,
    winner: 'opp',
    myHand: [{ id: 'still' }],
    opponentHandCount: 0,
    opponentFaceUp: [],
    opponentFaceDownCount: 0,
  };
  assert.equal(isLegalMatchEnd(loss), true);
  assert.equal(isLegalMatchEnd({ ...loss, opponentFaceDownCount: 1 }), false);
  assert.equal(isLegalMatchEnd({ ...loss, opponentFaceUp: [{ id: 'q' }] }), false);
  assert.equal(isLegalMatchEnd({ ...loss, opponentHandCount: 1 }), false);
  assert.equal(isLegalMatchEnd({ ...loss, deckCount: 1 }), false);
});

test('the end curtain waits until the winning card has been shown', () => {
  assert.ok(endSequenceDelayMs({ type: 'normal', wasFaceDown: true }) >= 2500);
  assert.ok(endSequenceDelayMs({ type: 'normal' }) >= 900);
  assert.ok(endSequenceDelayMs({ type: 'reset' }) >= 900);
  assert.ok(endSequenceDelayMs({ type: 'burn' }) >= 1000);
  assert.ok(endSequenceDelayMs({ type: 'set_complete' }) >= 1000);
  assert.ok(endSequenceDelayMs(null) > 0);
  assert.ok(endSequenceDelayMs(undefined) > 0);
});
