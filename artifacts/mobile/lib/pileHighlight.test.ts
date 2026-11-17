import assert from 'node:assert/strict';
import test from 'node:test';

import { PILE_HIGHLIGHT_RADIUS, highlightOnThresholdCross, isOverPile } from './pileHighlight';

test('the pile highlight is inside a strict 110px radius', () => {
  assert.equal(PILE_HIGHLIGHT_RADIUS, 110);
  assert.equal(isOverPile(200, 160, 200, 160), true);
  assert.equal(isOverPile(200, 269, 200, 160), true);
  assert.equal(isOverPile(200, 270, 200, 160), false);
  assert.equal(isOverPile(309, 160, 200, 160), true);
  assert.equal(isOverPile(310, 160, 200, 160), false);
});

test('the pile highlight flips only when the card crosses the radius', () => {
  assert.equal(highlightOnThresholdCross(false, false), null);
  assert.equal(highlightOnThresholdCross(true, true), null);
  assert.equal(highlightOnThresholdCross(false, true), true);
  assert.equal(highlightOnThresholdCross(true, false), false);
});
