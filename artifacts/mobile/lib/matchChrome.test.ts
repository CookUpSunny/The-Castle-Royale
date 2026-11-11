import assert from 'node:assert/strict';
import test from 'node:test';

import { computeFanPositions } from './fanLayout';
import {
  EMOTE_BUTTON,
  FINAL_TITLE_FRACTION,
  HAND_RAISE,
  emoteDock,
  finalThreeFrame,
  handFrame,
  menuClearance,
} from './matchChrome';

test('the hand block is raised and centered on the screen', () => {
  const hand = handFrame(390, 0, 0, 34);
  assert.equal(hand.centerX, 195);
  assert.equal(hand.shift, 0);
  assert.equal(hand.bottom, 34 + HAND_RAISE);
  assert.ok(HAND_RAISE >= 80, `raise ${HAND_RAISE} still sits on the buttons`);

  const uneven = handFrame(844, 47, 21, 12);
  assert.equal(uneven.centerX, 422);
  assert.equal(uneven.shift, 422 - (47 + (844 - 47 - 21) / 2));

  const placed = computeFanPositions(10, 390);
  const left = Math.min(...placed.map((card) => card.left));
  const right = Math.max(...placed.map((card) => card.left + 66));
  assert.ok(Math.abs((left + right) / 2 - 195) < 1);
  const full = computeFanPositions(18, 390);
  assert.ok(Math.abs(Math.min(...full.map((card) => card.left)) - 39.9) < 1);
});

test('chat sits directly above emoji and the hand clears that column', () => {
  const dock = emoteDock(12, 34);
  assert.equal(dock.right, 12);
  assert.equal(dock.emojiBottom, 34);
  assert.equal(dock.chatBottom, 34 + EMOTE_BUTTON + 8);
  assert.ok(dock.chatBottom > dock.emojiBottom);

  const hand = handFrame(390, 0, 0, 34);
  const stackTop = dock.chatBottom + dock.button;
  assert.ok(hand.bottom + 8 >= stackTop, 'cards still meet the chat button');
});

test('Final 3 title sits on the red line and the cards are centered clear of chat', () => {
  const frame = finalThreeFrame(390, 844, 47, 34, 0);
  assert.equal(frame.centerX, 195);
  assert.equal(frame.align, 'center');
  assert.ok(Math.abs(frame.top / 844 - FINAL_TITLE_FRACTION) < 0.015, `title at ${frame.top}`);
  assert.ok(frame.top / 844 > 0.65 && frame.top / 844 < 0.74);
  assert.ok(frame.cardTop > frame.top);
  const dock = emoteDock(0, 34);
  const buttonLeft = 390 - dock.right - dock.button;
  assert.ok(frame.rowRight <= buttonLeft - 8, `row ${frame.rowRight} hits button ${buttonLeft}`);
  const stackTop = 844 - (dock.chatBottom + dock.button);
  assert.ok(frame.cardTop < stackTop);

  const land = finalThreeFrame(844, 390, 0, 12, 21);
  assert.equal(land.centerX, 422);
  assert.ok(land.cardBottom <= 390 - 12);
});

test('the menu button stays above the raised hand', () => {
  const hand = handFrame(390, 0, 0, 34);
  assert.ok(menuClearance(34) >= hand.bottom + 160);
});
