import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CARD_WIDTH,
  FAN_CONTAINER_H,
  cardVisualBottom,
  computeFanPositions,
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
