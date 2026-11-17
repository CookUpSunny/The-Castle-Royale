import assert from 'node:assert/strict';
import test from 'node:test';

import { HAND_PLACE_MS, handPlaceStops } from './handPlace';

test('the placing hand swoops down before it presses', () => {
  const y = handPlaceStops(100);
  assert.equal(y.start, 320);
  assert.equal(y.approach, 136);
  assert.ok(y.approach < y.press);
  assert.ok(y.release < y.press);
  assert.ok(y.exit > y.start - 20);
  assert.equal(HAND_PLACE_MS.swoop, 240);
  assert.equal(HAND_PLACE_MS.press, 120);
  assert.equal(HAND_PLACE_MS.release, 140);
  assert.equal(HAND_PLACE_MS.exit, 260);
  assert.equal(HAND_PLACE_MS.swoop + HAND_PLACE_MS.press + HAND_PLACE_MS.release + HAND_PLACE_MS.exit, 760);
});
