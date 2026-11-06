import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { AVATAR_IDS } from './avatarPortrait';
import { CHARACTER_ART } from './characterArt';

test('the roster stays the six shipped characters and has no bull or new turnaround characters', () => {
  assert.deepEqual(AVATAR_IDS, ['eagles', 'frog', 'troll', 'gigi', 'rockner', 'sunami']);
  assert.deepEqual(Object.keys(CHARACTER_ART), [...AVATAR_IDS]);
  for (const banned of ['bull', 'empress', 'maverick', 'ronin', 'viper']) {
    assert.equal(AVATAR_IDS.includes(banned as never), false);
  }
});

test('Frog, Eagles, and Troll use a vertical selection frame and a separate full scene', () => {
  for (const id of ['eagles', 'frog', 'troll'] as const) {
    assert.equal(CHARACTER_ART[id].hasVerticalSelection, true);
    assert.notEqual(CHARACTER_ART[id].selection, CHARACTER_ART[id].scene);
    assert.equal(fs.existsSync(path.join(__dirname, '../assets/avatars', CHARACTER_ART[id].selection)), true);
    assert.equal(fs.existsSync(path.join(__dirname, '../assets/avatars', CHARACTER_ART[id].scene)), true);
  }
});

test('Gigi, Rockner, and Sunami fit the full scene for selection and the match', () => {
  for (const id of ['gigi', 'rockner', 'sunami'] as const) {
    assert.equal(CHARACTER_ART[id].hasVerticalSelection, false);
    assert.equal(CHARACTER_ART[id].selection, CHARACTER_ART[id].scene);
    assert.equal(fs.existsSync(path.join(__dirname, '../assets/avatars', CHARACTER_ART[id].scene)), true);
  }
});
