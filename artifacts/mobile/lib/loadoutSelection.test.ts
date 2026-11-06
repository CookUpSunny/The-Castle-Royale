import assert from 'node:assert/strict';
import test from 'node:test';

import {
  arenaAfterHydration,
  avatarAfterHydration,
  cardAfterHydration,
  confirmLoadout,
  equippableCardSkins,
  shownLoadout,
} from './loadoutSelection';

const saved = {
  hydrated: true,
  storedAvatar: 'frog' as const,
  storedArena: 'cosmic' as const,
  storedCard: 'crystal-ice' as const,
  avatarOverride: null,
  arenaOverride: null,
  cardOverride: null,
};

test('stored character, arena, and card back survive hydration', () => {
  assert.equal(avatarAfterHydration({ dirty: false, current: 'eagles', stored: 'frog' }), 'frog');
  assert.equal(arenaAfterHydration({ dirty: false, current: 'greenTable', stored: 'cosmic' }), 'cosmic');
  assert.deepEqual(cardAfterHydration({ dirty: false, current: 'royal-gold', stored: 'neon-glow' }), {
    skin: 'neon-glow',
    migrate: false,
  });
  assert.deepEqual(cardAfterHydration({ dirty: false, current: 'crystal-ice', stored: 'royal' }), {
    skin: 'royal-gold',
    migrate: true,
  });
  assert.deepEqual(cardAfterHydration({ dirty: false, current: 'royal-gold', stored: 'classic' }), {
    skin: 'neon-glow',
    migrate: true,
  });
  assert.deepEqual(cardAfterHydration({ dirty: false, current: 'crystal-ice', stored: 'cosmic' }), {
    skin: 'crystal-ice',
    migrate: false,
  });
  assert.deepEqual(cardAfterHydration({ dirty: false, current: 'royal-gold', stored: 'atlas-red' }), {
    skin: 'atlas-red',
    migrate: false,
  });
  assert.deepEqual(cardAfterHydration({ dirty: false, current: 'royal-gold', stored: 'queens-hand' }), {
    skin: 'queens-hand',
    migrate: false,
  });
  assert.equal(avatarAfterHydration({ dirty: false, current: 'eagles', stored: 'nope' }), 'eagles');
  assert.equal(avatarAfterHydration({ dirty: false, current: 'eagles', stored: null }), 'eagles');
  assert.equal(arenaAfterHydration({ dirty: false, current: 'greenTable', stored: 'castle' }), 'greenTable');
  assert.deepEqual(cardAfterHydration({ dirty: false, current: 'royal-gold', stored: 'midnight-void' }), {
    skin: 'royal-gold',
    migrate: false,
  });
  assert.deepEqual(cardAfterHydration({ dirty: false, current: 'royal-gold', stored: null }), {
    skin: 'royal-gold',
    migrate: false,
  });
});

test('a confirm during hydration is not overwritten by the saved value', () => {
  assert.equal(avatarAfterHydration({ dirty: true, current: 'gigi', stored: 'frog' }), 'gigi');
  assert.equal(arenaAfterHydration({ dirty: true, current: 'matrix', stored: 'cosmic' }), 'matrix');
  assert.deepEqual(cardAfterHydration({ dirty: true, current: 'inferno-flame', stored: 'atlas-red' }), {
    skin: 'inferno-flame',
    migrate: false,
  });
});

test('confirming before hydration does not start on the default character, arena, or card back', () => {
  const early = confirmLoadout({
    hydrated: false,
    storedAvatar: 'eagles',
    storedArena: 'greenTable',
    storedCard: 'royal-gold',
    avatarOverride: null,
    arenaOverride: null,
    cardOverride: null,
  });
  assert.equal(early, null);
});

test('selecting only one field still waits so the other defaults are not saved', () => {
  assert.equal(
    confirmLoadout({
      hydrated: false,
      storedAvatar: 'eagles',
      storedArena: 'greenTable',
      storedCard: 'royal-gold',
      avatarOverride: 'sunami',
      arenaOverride: null,
      cardOverride: null,
    }),
    null,
  );
  assert.equal(
    confirmLoadout({
      hydrated: false,
      storedAvatar: 'eagles',
      storedArena: 'greenTable',
      storedCard: 'royal-gold',
      avatarOverride: 'sunami',
      arenaOverride: 'lightning',
      cardOverride: null,
    }),
    null,
  );
  assert.equal(
    confirmLoadout({
      hydrated: false,
      storedAvatar: 'eagles',
      storedArena: 'greenTable',
      storedCard: 'royal-gold',
      avatarOverride: null,
      arenaOverride: null,
      cardOverride: 'sakura-blossom',
    }),
    null,
  );
});

test('an explicit loadout can start before hydration finishes', () => {
  const started = confirmLoadout({
    hydrated: false,
    storedAvatar: 'eagles',
    storedArena: 'greenTable',
    storedCard: 'royal-gold',
    avatarOverride: 'troll',
    arenaOverride: 'classic',
    cardOverride: 'inferno-flame',
  });
  assert.deepEqual(started, {
    avatar: 'troll',
    arena: 'classic',
    card: 'inferno-flame',
    seatAvatarId: 'troll',
  });
});

test('after hydration, start keeps the saved loadout unless the player picked another', () => {
  const savedStart = confirmLoadout(saved);
  assert.deepEqual(savedStart, {
    avatar: 'frog',
    arena: 'cosmic',
    card: 'crystal-ice',
    seatAvatarId: 'frog',
  });

  const picked = confirmLoadout({ ...saved, avatarOverride: 'rockner', cardOverride: 'sakura-blossom' });
  assert.deepEqual(picked, {
    avatar: 'rockner',
    arena: 'cosmic',
    card: 'sakura-blossom',
    seatAvatarId: 'rockner',
  });
  assert.equal(shownLoadout({ ...saved, avatarOverride: 'rockner' }).avatar, 'rockner');
  assert.equal(shownLoadout(saved).arena, 'cosmic');
  assert.equal(shownLoadout(saved).card, 'crystal-ice');
});

test('the pre-match card row offers image backs to every player and keeps premium skins subscribed', () => {
  const free = equippableCardSkins(false);
  assert.deepEqual(free.slice(0, 5), [
    'neon-glow',
    'royal-gold',
    'crystal-ice',
    'sakura-blossom',
    'inferno-flame',
  ]);
  for (const id of [
    'atlas-red',
    'castle-cards',
    'queens-hand',
    'coat-of-arms',
    'big-winner',
    'lady-luck',
    'gold-obsession',
    'royal-treasure-crest',
  ]) {
    assert.equal(free.includes(id), true, id);
  }
  assert.equal(free.includes('midnight-void'), false);
  assert.equal(free.length, 13);
  assert.equal(equippableCardSkins(true).includes('midnight-void'), true);
  assert.equal(equippableCardSkins(true).length, 18);
});
