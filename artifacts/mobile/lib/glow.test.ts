import assert from 'node:assert/strict';
import test from 'node:test';

import { cardBackStarsTwinkle, haloOpacity } from './glow';

test('the gold halo breathes only while a card is playable', () => {
  assert.equal(haloOpacity(0, true), 0.35);
  assert.equal(haloOpacity(1, true), 0.75);
  assert.equal(haloOpacity(0.5, false), 0.12);
});

test('table-size card backs do not twinkle', () => {
  assert.equal(cardBackStarsTwinkle('sm'), false);
  assert.equal(cardBackStarsTwinkle('md'), true);
  assert.equal(cardBackStarsTwinkle('lg'), true);
});
