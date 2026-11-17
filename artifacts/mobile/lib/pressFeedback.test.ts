import assert from 'node:assert/strict';
import test from 'node:test';

import { PRESS_MS, PRESS_OPACITY, PRESS_RELEASE_MS, PRESS_SCALE, scrubTick } from './pressFeedback';

test('press feedback is a 3 percent scale over 120ms', () => {
  assert.equal(PRESS_SCALE, 0.97);
  assert.equal(PRESS_MS, 120);
  assert.equal(PRESS_RELEASE_MS, 160);
  assert.equal(PRESS_OPACITY, 0.88);
});

test('the fan ticks once per card, not per frame', () => {
  assert.equal(scrubTick(null, 0), false);
  assert.equal(scrubTick(-1, 0), true);
  assert.equal(scrubTick(0, 0), false);
  assert.equal(scrubTick(0, 1), true);
  assert.equal(scrubTick(1, -1), false);
});
