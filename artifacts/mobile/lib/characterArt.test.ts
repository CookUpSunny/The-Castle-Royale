import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { AVATAR_IDS } from './avatarPortrait';
import { CHARACTER_ART, NEW_CHARACTER_IDS } from './characterArt';

test('the new six lead the roster and the original six stay', () => {
  assert.deepEqual(AVATAR_IDS.slice(0, 6), [...NEW_CHARACTER_IDS]);
  assert.deepEqual(AVATAR_IDS.slice(6), ['eagles', 'frog', 'troll', 'gigi', 'rockner', 'sunami']);
  assert.deepEqual(Object.keys(CHARACTER_ART), [...AVATAR_IDS]);
  for (const banned of ['empress', 'maverick', 'ronin', 'viper']) {
    assert.equal(AVATAR_IDS.includes(banned as never), false);
  }
});

test('each new character has a framed selection card and a separate cutout', () => {
  for (const id of NEW_CHARACTER_IDS) {
    assert.equal(CHARACTER_ART[id].framedSelection, true);
    assert.notEqual(CHARACTER_ART[id].selection, CHARACTER_ART[id].scene);
    assert.equal(fs.existsSync(path.join(__dirname, '../assets/avatars', CHARACTER_ART[id].selection)), true);
    assert.equal(fs.existsSync(path.join(__dirname, '../assets/avatars', CHARACTER_ART[id].scene)), true);
  }
});

test('Frog, Eagles, and Troll keep a vertical selection frame and a separate full scene', () => {
  for (const id of ['eagles', 'frog', 'troll'] as const) {
    assert.equal(CHARACTER_ART[id].framedSelection, false);
    assert.notEqual(CHARACTER_ART[id].selection, CHARACTER_ART[id].scene);
    assert.equal(fs.existsSync(path.join(__dirname, '../assets/avatars', CHARACTER_ART[id].selection)), true);
    assert.equal(fs.existsSync(path.join(__dirname, '../assets/avatars', CHARACTER_ART[id].scene)), true);
  }
});

test('Gigi, Rockner, and Sunami still use the full scene for selection and the match', () => {
  for (const id of ['gigi', 'rockner', 'sunami'] as const) {
    assert.equal(CHARACTER_ART[id].framedSelection, false);
    assert.equal(CHARACTER_ART[id].selection, CHARACTER_ART[id].scene);
    assert.equal(fs.existsSync(path.join(__dirname, '../assets/avatars', CHARACTER_ART[id].scene)), true);
  }
});
