import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { ARENA_IDS } from './loadoutSelection';
import {
  SHOP_ARENA_CATALOG,
  SHOP_CAROUSEL_FADE,
  SHOP_PACK_BLURB,
  SHOP_PACK_SCALE,
  SHOP_TAGLINE,
  activeEntitlementIds,
  arenaStoreInput,
  cardPackStoreInput,
  carouselContentInset,
  findPricedPackage,
  resolveStoreItemState,
  shopArenaIds,
  shopArenaTileSize,
  shopPackTileSize,
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

function sentences(copy: string): string[] {
  return copy.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter(Boolean);
}

test('the House speaks in short shop lines, and the tagline is one title-case sentence pair', () => {
  assert.equal(SHOP_TAGLINE, 'Dress Your Table In Royal Splendor. The House Rules Never Change.');
  assert.equal(SHOP_TAGLINE.includes('\n'), false);
  for (const entry of SHOP_ARENA_CATALOG) {
    const lines = sentences(entry.blurb);
    assert.ok(lines.length >= 2 && lines.length <= 3, `${entry.id} has ${lines.length} sentences`);
    assert.match(entry.blurb, /^The House /, entry.id);
    assert.ok(entry.blurb.length <= 220, entry.id);
  }
  const pack = sentences(SHOP_PACK_BLURB);
  assert.ok(pack.length >= 2 && pack.length <= 3);
  assert.match(SHOP_PACK_BLURB, /mirror/i);
  assert.match(SHOP_PACK_BLURB, /no promises/i);
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

test('arena carousel inset clears the fade and the landscape safe area', () => {
  assert.ok(SHOP_CAROUSEL_FADE >= 32 && SHOP_CAROUSEL_FADE <= 48);
  assert.equal(carouselContentInset(0), SHOP_CAROUSEL_FADE);
  assert.equal(carouselContentInset(20), SHOP_CAROUSEL_FADE);
  assert.equal(carouselContentInset(62), 62);
  assert.equal(carouselContentInset(-4), SHOP_CAROUSEL_FADE);
});

test('card pack tiles grow to about 1.7x and a row stays inside the stage', () => {
  assert.ok(SHOP_PACK_SCALE >= 1.6 && SHOP_PACK_SCALE <= 1.8);
  const base = shopArenaTileSize(402, 0, 21);
  assert.equal(base.height, 134);
  assert.equal(base.width, Math.round(134 * 4 / 3));
  const grown = shopPackTileSize(base, { maxWidth: 850, maxHeight: 280 }, 1, 16);
  const linear = grown.width / base.width;
  assert.ok(linear >= 1.6 && linear <= 1.8, `scale ${linear}`);
  assert.ok(Math.abs(grown.width / grown.height - base.width / base.height) < 0.03);
  assert.ok(grown.height <= 280);
  assert.ok(grown.width <= 850);

  const clamped = shopPackTileSize(base, { maxWidth: 850, maxHeight: 180 }, 1, 16);
  assert.ok(clamped.height <= 180);
  assert.ok(clamped.height < grown.height);
  assert.ok(Math.abs(clamped.width / clamped.height - base.width / base.height) < 0.04);

  const row = shopPackTileSize(base, { maxWidth: 500, maxHeight: 280 }, 2, 16);
  assert.ok(row.width * 2 + 16 <= 501);
  assert.ok(Math.abs(row.width / row.height - base.width / base.height) < 0.04);
});

test('the shop screen fades the arena carousel and centers the card pack row', () => {
  const shop = fs.readFileSync(path.join(__dirname, '../components/RoyalShop.tsx'), 'utf8');
  const mask = fs.readFileSync(path.join(__dirname, '../components/ShopEdgeMask.tsx'), 'utf8');
  const web = fs.readFileSync(path.join(__dirname, '../components/ShopEdgeMask.web.tsx'), 'utf8');
  assert.match(shop, /ShopEdgeMask/);
  assert.match(shop, /carouselContentInset\(insets\.left\)/);
  assert.match(shop, /carouselContentInset\(insets\.right\)/);
  assert.match(shop, /shop-pack-stage/);
  assert.match(shop, /packStage: \{[^}]*alignItems: 'center'/);
  assert.match(shop, /packStage: \{[^}]*justifyContent: 'center'/);
  assert.match(shop, /shopPackTileSize/);
  assert.match(mask, /pointerEvents="none"/);
  assert.match(mask, /MaskedView/);
  assert.match(web, /mask-image/);
});
