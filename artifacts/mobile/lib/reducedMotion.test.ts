import assert from 'node:assert/strict';
import test from 'node:test';

import { overlayHoldMs, softenedFadeMs } from './reducedMotion';

test('Reduce Motion shortens overlay holds and keeps a short fade', () => {
  assert.equal(overlayHoldMs('faceDownReveal', false), 2580);
  assert.equal(overlayHoldMs('faceDownReveal', true), 1100);
  assert.equal(overlayHoldMs('multiPlayBurst', false), 1700);
  assert.equal(overlayHoldMs('multiPlayBurst', true), 900);
  assert.equal(softenedFadeMs(480, false), 480);
  assert.equal(softenedFadeMs(480, true), 200);
  assert.equal(softenedFadeMs(160, true), 160);
  assert.equal(softenedFadeMs(80, true), 150);
});
