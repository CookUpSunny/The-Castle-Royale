import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AVATAR_IDS,
  hashName,
  matchPortraits,
  resolveOpponentAvatarId,
  sanitizeAvatarId,
} from './avatarPortrait';

test('sanitize keeps the six characters and drops anything else', () => {
  for (const id of AVATAR_IDS) {
    assert.equal(sanitizeAvatarId(id), id);
    assert.equal(sanitizeAvatarId(`  ${id}  `), id);
  }
  assert.equal(sanitizeAvatarId(undefined), undefined);
  assert.equal(sanitizeAvatarId(null), undefined);
  assert.equal(sanitizeAvatarId(''), undefined);
  assert.equal(sanitizeAvatarId('eagles-extra'), undefined);
  assert.equal(sanitizeAvatarId('EAGLES'), undefined);
  assert.equal(sanitizeAvatarId(1), undefined);
  assert.equal(sanitizeAvatarId('x'.repeat(33)), undefined);
});

test('portrait and landscape resolve the same seated character', () => {
  for (const id of AVATAR_IDS) {
    const portrait = resolveOpponentAvatarId(id, 'Whoever');
    const landscape = resolveOpponentAvatarId(id, 'Whoever');
    assert.equal(portrait, id);
    assert.equal(landscape, id);
    assert.equal(portrait, landscape);
  }
});

test('a missing avatar falls back to the same name hash in both orientations', () => {
  const name = 'Shadow';
  const expected = AVATAR_IDS[hashName(name) % AVATAR_IDS.length];
  assert.equal(resolveOpponentAvatarId(undefined, name), expected);
  assert.equal(resolveOpponentAvatarId(null, name), expected);
  assert.equal(resolveOpponentAvatarId('not-a-character', name), expected);
  assert.equal(resolveOpponentAvatarId(undefined, name), resolveOpponentAvatarId(null, name));
});

test('an unknown id falls back instead of replacing the local character', () => {
  const boards = matchPortraits('bull', 'not-a-character', 'Shadow');
  assert.equal(boards.localAvatarId, 'bull');
  assert.equal(boards.opponentAvatarId, resolveOpponentAvatarId(undefined, 'Shadow'));

  const known = matchPortraits('frog', 'gigi', 'Ace');
  assert.equal(known.localAvatarId, 'frog');
  assert.equal(known.opponentAvatarId, 'gigi');

  const fallback = matchPortraits('rockner', null, 'Shadow');
  assert.equal(fallback.localAvatarId, 'rockner');
  assert.equal(fallback.opponentAvatarId, resolveOpponentAvatarId(null, 'Shadow'));
  assert.notEqual(fallback.localAvatarId, fallback.opponentAvatarId);
});
