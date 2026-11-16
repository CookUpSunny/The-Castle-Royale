import assert from 'node:assert/strict';
import test from 'node:test';

import { ARENA_IDS } from './loadoutSelection';
import {
  SHOP_ARENA_CATALOG,
  activeEntitlementIds,
  arenaStoreInput,
  cardPackStoreInput,
  findPricedPackage,
  resolveStoreItemState,
  shopArenaIds,
} from './royalShop';

test('store item state covers equipped, owned, locked, and no product', () => {
  const equipped = resolveStoreItemState({ owned: true, equipped: true, priceString: '$4.99' });
  assert.equal(equipped.status, 'equipped');
  assert.equal(equipped.locked, false);
  assert.equal(equipped.canPurchase, false);
  assert.equal(equipped.canSelect, false);
  assert.equal(equipped.actionLabel, 'Equipped');
  assert.equal(equipped.showPrice, false);

  const ownedArena = resolveStoreItemState(cardPackStoreInput({ owns: true, equipped: false, priceString: '$4.99' }));
  assert.equal(ownedArena.status, 'owned');
  assert.equal(ownedArena.actionLabel, 'Equip');
  assert.equal(ownedArena.canSelect, true);
  assert.equal(ownedArena.canPurchase, false);
  assert.equal(ownedArena.locked, false);

  const ownedSelect = resolveStoreItemState({ owned: true, equipped: false, priceString: '$2.99', ownedAction: 'Select' });
  assert.equal(ownedSelect.status, 'owned');
  assert.equal(ownedSelect.actionLabel, 'Select');

  const locked = resolveStoreItemState({ owned: false, equipped: false, priceString: '$4.99' });
  assert.equal(locked.status, 'locked');
  assert.equal(locked.locked, true);
  assert.equal(locked.canPurchase, true);
  assert.equal(locked.canSelect, false);
  assert.equal(locked.showPrice, true);
  assert.equal(locked.priceLabel, '$4.99');
  assert.equal(locked.actionLabel, 'Buy $4.99');

  const unavailable = resolveStoreItemState({ owned: false, equipped: false, priceString: null });
  assert.equal(unavailable.status, 'unavailable');
  assert.equal(unavailable.locked, true);
  assert.equal(unavailable.canPurchase, false);
  assert.equal(unavailable.actionLabel, 'Coming soon');
  assert.equal(unavailable.priceLabel, null);

  const blank = resolveStoreItemState({ owned: false, equipped: false, priceString: '   ' });
  assert.equal(blank.status, 'unavailable');
  assert.equal(blank.canPurchase, false);
});

test('free arenas stay free and locked arenas wait for a product', () => {
  assert.deepEqual(shopArenaIds(), [...ARENA_IDS]);
  const freeIds = ['greenTable', 'classic', 'cosmic', 'royal', 'lightning'] as const;
  for (const id of freeIds) {
    const entry = SHOP_ARENA_CATALOG.find((item) => item.id === id);
    assert.ok(entry);
    assert.equal(entry.productId, undefined);
    const view = resolveStoreItemState(arenaStoreInput(entry, {
      equipped: id === 'greenTable',
      isSubscribed: false,
      activeEntitlementIds: [],
      priceString: '$9.99',
    }));
    assert.equal(view.canPurchase, false, id);
    assert.equal(view.locked, false, id);
    assert.equal(view.status, id === 'greenTable' ? 'equipped' : 'owned', id);
  }

  const matrix = SHOP_ARENA_CATALOG.find((item) => item.id === 'matrix');
  const rainbow = SHOP_ARENA_CATALOG.find((item) => item.id === 'rainbowRoad');
  assert.ok(matrix && rainbow);
  assert.equal(matrix.productId, undefined);
  assert.equal(matrix.entitlementId, undefined);

  const comingSoon = resolveStoreItemState(arenaStoreInput(matrix, {
    equipped: true,
    isSubscribed: false,
    activeEntitlementIds: [],
    priceString: null,
  }));
  assert.equal(comingSoon.status, 'unavailable');
  assert.equal(comingSoon.locked, true);
  assert.equal(comingSoon.actionLabel, 'Coming soon');
  assert.equal(comingSoon.canSelect, false);

  const member = resolveStoreItemState(arenaStoreInput(rainbow, {
    equipped: false,
    isSubscribed: true,
    activeEntitlementIds: ['premium'],
    priceString: null,
  }));
  assert.equal(member.status, 'owned');
  assert.equal(member.actionLabel, 'Select');
  assert.equal(member.locked, false);

  const withProduct = {
    ...matrix,
    productId: 'arena_matrix',
    entitlementId: 'arena_matrix',
  };
  const priced = resolveStoreItemState(arenaStoreInput(withProduct, {
    equipped: false,
    isSubscribed: false,
    activeEntitlementIds: [],
    priceString: '$1.99',
  }));
  assert.equal(priced.status, 'locked');
  assert.equal(priced.canPurchase, true);
  assert.equal(priced.actionLabel, 'Buy $1.99');

  const unpriced = resolveStoreItemState(arenaStoreInput(withProduct, {
    equipped: false,
    isSubscribed: false,
    activeEntitlementIds: [],
    priceString: '',
  }));
  assert.equal(unpriced.status, 'unavailable');
  assert.equal(unpriced.canPurchase, false);

  const bought = resolveStoreItemState(arenaStoreInput(withProduct, {
    equipped: true,
    isSubscribed: false,
    activeEntitlementIds: ['arena_matrix'],
    priceString: '$1.99',
  }));
  assert.equal(bought.status, 'equipped');
  assert.equal(bought.locked, false);
  assert.equal(bought.canPurchase, false);
});

test('a missing arena product does not throw and a priced package is returned', () => {
  assert.deepEqual(activeEntitlementIds(null), []);
  assert.deepEqual(activeEntitlementIds({ entitlements: { active: { premium: { id: 'premium' } } } }), ['premium']);
  assert.equal(findPricedPackage(null, 'arena_matrix'), null);
  assert.equal(findPricedPackage({ current: { availablePackages: [] } }, undefined), null);
  assert.equal(
    findPricedPackage({
      current: { availablePackages: [{ product: { identifier: 'arena_matrix', priceString: '' } }] },
    }, 'arena_matrix'),
    null,
  );
  const found = findPricedPackage({
    current: { availablePackages: [{ product: { identifier: 'vip_year', priceString: '$59.99' } }] },
    all: {
      arena_matrix: {
        availablePackages: [
          { identifier: '$rc_monthly', product: { identifier: 'arena_matrix', priceString: '$2.99' } },
          { identifier: '$rc_lifetime', product: { identifier: 'arena_matrix', priceString: '$1.99' } },
        ],
      },
    },
  }, 'arena_matrix', { offeringId: 'arena_matrix', packageId: '$rc_lifetime' });
  assert.equal(found?.identifier, '$rc_lifetime');
  assert.equal(found?.product?.priceString, '$1.99');
});
