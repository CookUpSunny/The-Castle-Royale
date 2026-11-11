import assert from 'node:assert/strict';
import test from 'node:test';

import { computeFanPositions } from './fanLayout';
import {
  EMOTE_BUTTON,
  FINAL_TITLE_FRACTION,
  HAND_RAISE,
  MAIN_HAND_SLOT,
  emoteDock,
  finalThreeFrame,
  handFrame,
  landscapeCenterFrame,
  menuClearance,
  portraitCenterFrame,
} from './matchChrome';

test('the hand sits a short step above main and stays centered', () => {
  assert.ok(HAND_RAISE >= 16 && HAND_RAISE <= 20);
  assert.equal(HAND_RAISE, 18);
  const hand = handFrame(390, 0, 0, 34);
  assert.equal(hand.centerX, 195);
  assert.equal(hand.shift, 0);
  assert.equal(hand.bottom, 34 + 18);

  const placed = computeFanPositions(18, 390);
  assert.ok(Math.abs(Math.min(...placed.map((card) => card.left)) - 39.9) < 1);
});

test('the center pile matches main for an 18-card hand and for Final 3', () => {
  const mainPortrait = portraitCenterFrame(640);
  assert.equal(mainPortrait.handSlot, MAIN_HAND_SLOT);
  assert.equal(mainPortrait.handSlot, 162);
  assert.equal(mainPortrait.tableHeight, 640 - 162);
  assert.equal(mainPortrait.pileNudge, 16);
  assert.equal(mainPortrait.pileCenterY, 6 + (640 - 162 - 6) / 2 + 8);
  assert.deepEqual(portraitCenterFrame(640), mainPortrait);
  assert.deepEqual(portraitCenterFrame(480), portraitCenterFrame(480));

  const mainLand = landscapeCenterFrame(390, 80);
  const visible = Math.round(100 * 0.75);
  assert.equal(mainLand.handSlot, visible);
  assert.equal(mainLand.tableHeight, 390 - 80 - visible);
  assert.ok(mainLand.tableHeight > mainLand.handSlot);
  assert.equal(mainLand.pileCenterY, mainLand.tableHeight / 2);
  assert.deepEqual(landscapeCenterFrame(390, 80), mainLand);
});

test('chat sits directly above emoji in the same column', () => {
  const dock = emoteDock(12, 34);
  assert.equal(dock.right, 12);
  assert.equal(dock.emojiBottom, 34);
  assert.equal(dock.chatBottom, 34 + EMOTE_BUTTON + 8);
  assert.ok(dock.chatBottom > dock.emojiBottom);
  assert.equal(HAND_RAISE, 18);
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
