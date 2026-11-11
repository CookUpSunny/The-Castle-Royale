import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CARD_HEIGHT,
  CARD_WIDTH,
  FAN_CONTAINER_H,
  cardVisualBottom,
  computeFanPositions,
  computeLandscapeFanPositions,
  landscapeHandWindow,
} from './fanLayout';

function lowestBottom(total: number, width = 390): number {
  const placed = computeFanPositions(total, width);
  assert.equal(placed.length, total);
  return Math.max(...placed.map(cardVisualBottom));
}

test('every hand size shares the same bottom anchor', () => {
  const bottoms = [1, 2, 3, 8, 12].map((total) => lowestBottom(total));
  for (const bottom of bottoms) {
    assert.ok(Math.abs(bottom - (FAN_CONTAINER_H - 8)) < 0.05, `bottom ${bottom}`);
    assert.equal(bottom, bottoms[0]);
  }
});

test('a shrinking hand does not rise off the baseline', () => {
  const full = lowestBottom(12);
  const late = lowestBottom(3);
  const last = lowestBottom(1);
  assert.ok(Math.abs(full - late) < 0.05);
  assert.ok(Math.abs(late - last) < 0.05);
});

test('the fan stays centered in its container', () => {
  for (const width of [375, 390, 393, 430]) {
    const placed = computeFanPositions(3, width);
    const middle = placed[1]!;
    assert.ok(Math.abs(middle.left + CARD_WIDTH / 2 - width / 2) < 0.05);
  }
});

test('a landscape hand hugs the bottom edge and spreads across the table', () => {
  const width = 700;
  const placed = computeLandscapeFanPositions(10, width);
  const visible = landscapeHandWindow();
  assert.ok(visible / CARD_HEIGHT > 0.7 && visible / CARD_HEIGHT < 0.82);
  const left = Math.min(...placed.map((card) => card.left));
  const right = Math.max(...placed.map((card) => card.left + CARD_WIDTH));
  assert.ok(right - left > width * 0.5);
  assert.ok(Math.abs(placed[4]!.left + CARD_WIDTH / 2 - width / 2) < 30);
  for (const card of placed) {
    assert.equal(card.top, 0);
    assert.ok(card.top + CARD_HEIGHT > visible);
  }
});
