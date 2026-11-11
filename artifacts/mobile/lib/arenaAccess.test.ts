import assert from 'node:assert/strict';
import test from 'node:test';

import { canPlayArena, freeArenaIds, isArenaPremium } from './arenaAccess';

test('the free starter set is the arenas that were already free plus Cosmic Sanctum and Olympus Throne', () => {
  assert.deepEqual(freeArenaIds(), ['greenTable', 'classic', 'cosmic', 'royal', 'lightning']);
  for (const id of ['greenTable', 'classic', 'cosmic', 'royal', 'lightning'] as const) {
    assert.equal(canPlayArena(id, false), true, id);
    assert.equal(canPlayArena(id, true), true, id);
  }
});

test('Matrix and Rainbow Road stay paid for a new or existing free player', () => {
  assert.equal(isArenaPremium('matrix'), true);
  assert.equal(isArenaPremium('rainbowRoad'), true);
  assert.equal(canPlayArena('matrix', false), false);
  assert.equal(canPlayArena('rainbowRoad', false), false);
  assert.equal(canPlayArena('matrix', true), true);
  assert.equal(canPlayArena('rainbowRoad', true), true);
});
