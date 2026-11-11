import assert from 'node:assert/strict';
import test from 'node:test';

import { INTRO_FALLBACK_MS, shouldPlayLaunchIntro } from './launchIntro';

test('the launch intro plays once unless Reduce Motion is on', () => {
  assert.equal(shouldPlayLaunchIntro({ reduceMotion: false, alreadyPlayed: false }), true);
  assert.equal(shouldPlayLaunchIntro({ reduceMotion: true, alreadyPlayed: false }), false);
  assert.equal(shouldPlayLaunchIntro({ reduceMotion: false, alreadyPlayed: true }), false);
  assert.equal(INTRO_FALLBACK_MS, 6000);
});
