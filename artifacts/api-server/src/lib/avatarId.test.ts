import assert from 'node:assert/strict';
import test from 'node:test';

import { applyPlayerAvatars, resolveSeatAvatar, sanitizeAvatarId } from './avatarId.js';
import { dealGame, getGameView } from './gameEngine.js';

test('sanitize accepts only the shipped characters', () => {
  assert.equal(sanitizeAvatarId('gigi'), 'gigi');
  assert.equal(sanitizeAvatarId('  sunami '), 'sunami');
  assert.equal(sanitizeAvatarId(undefined), undefined);
  assert.equal(sanitizeAvatarId(''), undefined);
  assert.equal(sanitizeAvatarId('drop table'), undefined);
  assert.equal(sanitizeAvatarId({ id: 'frog' }), undefined);
});

test('a seat payload wins over an older preference and junk does not clear it', () => {
  const kept = resolveSeatAvatar('frog', undefined);
  assert.equal(kept.seated, 'frog');
  assert.equal(kept.preference, 'frog');

  const replaced = resolveSeatAvatar('frog', 'gigi');
  assert.equal(replaced.seated, 'gigi');
  assert.equal(replaced.preference, 'gigi');

  const junk = resolveSeatAvatar('frog', 'not-real');
  assert.equal(junk.seated, 'frog');
  assert.equal(junk.preference, 'frog');

  const absent = resolveSeatAvatar(undefined, undefined);
  assert.equal(absent.seated, undefined);
});

test('each player keeps their own character and a later stamp cannot replace it', () => {
  const state = dealGame(['ada', 'bea'], ['Ada', 'Bea']);
  applyPlayerAvatars(state.players, [
    { playerId: 'ada', avatarId: 'frog' },
    { playerId: 'bea', avatarId: 'gigi' },
  ]);
  applyPlayerAvatars(state.players, [
    { playerId: 'ada', avatarId: 'eagles' },
    { playerId: 'bea', avatarId: 'frog' },
    { playerId: 'ada', avatarId: 'rockner' },
  ]);

  assert.equal(state.players.ada!.avatarId, 'frog');
  assert.equal(state.players.bea!.avatarId, 'gigi');

  const ada = getGameView(state, 'ada');
  const bea = getGameView(state, 'bea');
  assert.equal(ada.opponentAvatarId, 'gigi');
  assert.equal(bea.opponentAvatarId, 'frog');
  assert.equal(ada.opponentAvatarId, state.players.bea!.avatarId);
  assert.equal(bea.opponentAvatarId, state.players.ada!.avatarId);
  assert.equal(ada.avatarId, undefined);
  assert.equal(ada.myAvatarId, undefined);
  assert.equal(bea.avatarId, undefined);
});

test('an old client with no avatar leaves the opponent id empty', () => {
  const state = dealGame(['ada', 'bea'], ['Ada', 'Bea']);
  applyPlayerAvatars(state.players, [
    { playerId: 'ada', avatarId: undefined },
    { playerId: 'bea', avatarId: 'nope' },
  ]);
  assert.equal(state.players.ada!.avatarId, undefined);
  assert.equal(state.players.bea!.avatarId, undefined);
  assert.equal(getGameView(state, 'ada').opponentAvatarId, null);
  assert.equal(getGameView(state, 'bea').opponentAvatarId, null);
});

test('stamping one seat does not write the other player', () => {
  const state = dealGame(['ada', 'bea'], ['Ada', 'Bea']);
  applyPlayerAvatars(state.players, [{ playerId: 'ada', avatarId: 'troll' }]);
  assert.equal(state.players.ada!.avatarId, 'troll');
  assert.equal(state.players.bea!.avatarId, undefined);
  assert.equal(getGameView(state, 'bea').opponentAvatarId, 'troll');
  assert.equal(getGameView(state, 'ada').opponentAvatarId, null);
});
