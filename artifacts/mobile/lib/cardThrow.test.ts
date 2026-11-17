import assert from 'node:assert/strict';
import test from 'node:test';

import { fanCardCenter, pendingThrowOutcome, THROW_SAFETY_MS, throwLanded } from './cardThrow';

test('a thrown card lands on its own play event', () => {
  const event = {
    type: 'normal' as const,
    playerId: 'me',
    card: { id: 'c1', value: 9, suit: 'S' as const },
  };
  assert.equal(throwLanded(event, 'me', 'c1'), true);
  assert.equal(throwLanded(event, 'me', 'c2'), false);
  assert.equal(throwLanded(event, 'them', 'c1'), false);
  assert.equal(throwLanded({ ...event, type: 'pickup' }, 'me', 'c1'), false);
  assert.equal(throwLanded(undefined, 'me', 'c1'), false);
  assert.equal(THROW_SAFETY_MS, 1200);
});

test('a pending throw springs back only while the card is still in hand', () => {
  assert.equal(pendingThrowOutcome({ landed: true, cardStillInHand: false }), 'land');
  assert.equal(pendingThrowOutcome({ landed: false, cardStillInHand: true }), 'reject');
  assert.equal(pendingThrowOutcome({ landed: false, cardStillInHand: false }), 'land');
});

test('a tap origin is the centre of that fan slot', () => {
  assert.deepEqual(fanCardCenter(10, 20, 30, 40), { x: 10 + 30 + 33, y: 20 + 40 + 50 });
});
