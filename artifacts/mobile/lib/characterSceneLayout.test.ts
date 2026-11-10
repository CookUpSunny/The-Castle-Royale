import assert from 'node:assert/strict';
import test from 'node:test';

import { computeFanPositions } from './fanLayout';
import {
  CORNER_OPACITY,
  landscapeOpponentCorner,
  landscapePlayerCorner,
  portraitOpponentCorner,
  portraitPlayerCorner,
} from './characterSceneLayout';

test('corner figures bleed off the screen and stay translucent', () => {
  const player = portraitPlayerCorner(390, 844);
  const opponent = portraitOpponentCorner(390, 844);
  assert.ok(player.left! < 0);
  assert.ok(player.bottom! < 0);
  assert.ok(opponent.top! < 0);
  assert.ok(opponent.right! < 0);
  assert.equal(player.pointerEvents, 'none');
  assert.equal(opponent.pointerEvents, 'none');
  assert.ok(player.opacity >= 0.55 && player.opacity <= 0.7);
  assert.equal(player.opacity, CORNER_OPACITY);
  assert.equal(player.fit, 'contain');

  const landPlayer = landscapePlayerCorner(844, 390);
  const landOpponent = landscapeOpponentCorner(844, 390);
  assert.ok(landPlayer.left! < 0 && landPlayer.bottom! < 0);
  assert.ok(landOpponent.top! < 0 && landOpponent.right! < 0);
  assert.equal(landPlayer.pointerEvents, 'none');
});

test('an 18-card fan keeps the unshifted spread from main', () => {
  const placed = computeFanPositions(18, 390);
  const left = Math.min(...placed.map((card) => card.left));
  assert.ok(left < 80, `fan was shifted to ${left}`);
  assert.equal(placed.length, 18);
});
