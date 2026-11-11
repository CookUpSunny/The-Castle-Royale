import assert from 'node:assert/strict';
import test from 'node:test';

import { computeFanPositions } from './fanLayout';
import {
  HAND_RAISE,
  emoteDock,
  finalThreeFrame,
  handFrame,
  menuClearance,
} from './matchChrome';

test('the hand is raised and centered without changing the fan', () => {
  const hand = handFrame(390, 0, 0, 34);
  assert.equal(hand.centerX, 195);
  assert.equal(hand.bottom, 34 + HAND_RAISE);
  assert.ok(hand.bottom > 34);

  const uneven = handFrame(844, 47, 21, 12);
  assert.equal(uneven.centerX, 47 + (844 - 47 - 21) / 2);

  const placed = computeFanPositions(18, 390);
  const left = Math.min(...placed.map((card) => card.left));
  const right = Math.max(...placed.map((card) => card.left));
  assert.ok(Math.abs(left - 39.9) < 1);
  assert.ok(Math.abs(right - 284.1) < 1);
});

test('chat sits directly above emoji in the same column', () => {
  const dock = emoteDock(16, 34);
  assert.equal(dock.right, 16);
  assert.equal(dock.emojiBottom, 34);
  assert.equal(dock.chatBottom, dock.emojiBottom + dock.button + dock.gap);
  assert.ok(dock.chatBottom > dock.emojiBottom);
  assert.equal(dock.gap, 8);
});

test('Final 3 is centered in the upper-middle', () => {
  const frame = finalThreeFrame(390, 844, 47);
  assert.equal(frame.centerX, 195);
  assert.equal(frame.align, 'center');
  assert.ok(frame.top >= 844 * 0.22, `title too high: ${frame.top}`);
  assert.ok(frame.top <= 844 * 0.42, `title too low: ${frame.top}`);
  assert.ok(frame.top > 47);

  const land = finalThreeFrame(844, 390, 0);
  assert.equal(land.centerX, 422);
  assert.ok(land.top > 0 && land.top < 390 * 0.45);
});

test('the menu button stays above the raised hand', () => {
  const hand = handFrame(390, 0, 0, 34);
  const buttonBottom = menuClearance(34);
  assert.ok(buttonBottom >= hand.bottom + 160);
});
