import assert from 'node:assert/strict';
import test from 'node:test';

import { advanceSplashPhase } from './splashPhase';

test('splash phases only move forward', () => {
  assert.equal(advanceSplashPhase('intro', 'gravity'), 'gravity');
  assert.equal(advanceSplashPhase('gravity', 'studio'), 'studio');
  assert.equal(advanceSplashPhase('studio', 'done'), 'done');
  assert.equal(advanceSplashPhase('intro', 'done'), 'done');
});

test('a late splash callback cannot rewind the chain', () => {
  assert.equal(advanceSplashPhase('studio', 'gravity'), 'studio');
  assert.equal(advanceSplashPhase('done', 'gravity'), 'done');
  assert.equal(advanceSplashPhase('done', 'intro'), 'done');
  assert.equal(advanceSplashPhase('gravity', 'gravity'), 'gravity');
});
