import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  GRANDSCAPE_CARD_BACK_FILE,
  GRANDSCAPE_MARKETING_FILE,
  GRANDSCAPE_MIRROR_PACK,
  GRANDSCAPE_PLAYABLE_FACE_FILES,
  GRANDSCAPE_SHOP_PREVIEW_CARDS,
  activeCardFacePack,
  cardFacePackAfterHydration,
  findGrandscapePackage,
  grandscapeExpectedAssetFiles,
  grandscapePlayableFaceFile,
  grandscapeShopView,
  isGrandscapePlayableFaceFile,
  isStorePurchaseCancelled,
  ownsGrandscapeMirrorPack,
} from './grandscapeMirrorPack';

test('the playable deck is the standard 52 faces and excludes marketing and the back', () => {
  assert.equal(GRANDSCAPE_PLAYABLE_FACE_FILES.length, 52);
  assert.equal(new Set(GRANDSCAPE_PLAYABLE_FACE_FILES).size, 52);
  assert.equal(isGrandscapePlayableFaceFile(GRANDSCAPE_MARKETING_FILE), false);
  assert.equal(isGrandscapePlayableFaceFile(GRANDSCAPE_CARD_BACK_FILE), false);
  assert.equal(GRANDSCAPE_PLAYABLE_FACE_FILES.includes(GRANDSCAPE_MARKETING_FILE), false);
  assert.equal(GRANDSCAPE_PLAYABLE_FACE_FILES.includes(GRANDSCAPE_CARD_BACK_FILE), false);

  const expected = grandscapeExpectedAssetFiles();
  assert.equal(expected.length, 54);
  assert.equal(expected.filter((item) => item.role === 'face').length, 52);
  assert.deepEqual(expected.filter((item) => item.role === 'marketing').map((item) => item.file), [
    'marketing/ace_of_spades_crown.webp',
  ]);
  assert.deepEqual(expected.filter((item) => item.role === 'back').map((item) => item.file), ['cardback.webp']);
});

test('ace of spades resolves to the playable face, never the marketing crown', () => {
  assert.equal(grandscapePlayableFaceFile({ suit: 'S', value: 14 }), 'spades/A.webp');
  assert.equal(grandscapePlayableFaceFile({ suit: 'S', value: 1 }), 'spades/A.webp');
  assert.notEqual(grandscapePlayableFaceFile({ suit: 'S', value: 14 }), GRANDSCAPE_MARKETING_FILE);
  assert.equal(grandscapePlayableFaceFile({ suit: 'S', value: 10 }), 'spades/10.webp');
  assert.equal(grandscapePlayableFaceFile({ suit: 'H', value: 13 }), 'hearts/K.webp');
  assert.equal(grandscapePlayableFaceFile({ suit: 'D', value: 12 }), 'diamonds/Q.webp');
  assert.equal(grandscapePlayableFaceFile({ suit: 'C', value: 11 }), 'clubs/J.webp');
  assert.equal(grandscapePlayableFaceFile({ suit: 'H', value: 2 }), 'hearts/2.webp');
  assert.equal(grandscapePlayableFaceFile({ suit: 'S', value: 0 }), null);
  assert.equal(grandscapePlayableFaceFile({ suit: 'X', value: 14 }), null);
  assert.equal(grandscapePlayableFaceFile({ suit: 'S', value: 15 }), null);

  for (const card of GRANDSCAPE_SHOP_PREVIEW_CARDS) {
    const file = grandscapePlayableFaceFile(card);
    assert.equal(file === null, false);
    assert.equal(isGrandscapePlayableFaceFile(file!), true);
    assert.notEqual(file, GRANDSCAPE_MARKETING_FILE);
  }
});

test('the face image module does not reference the marketing crown', () => {
  const src = fs.readFileSync(path.join(__dirname, 'grandscapeMirrorImages.ts'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.equal(code.includes('ace_of_spades_crown'), false);
  assert.equal(code.includes('marketing/'), false);
  assert.match(code, /GRANDSCAPE_FACE_SOURCES/);
  assert.match(code, /grandscapePlayableFaceFile/);
});

test('ownership is the grandscape entitlement, not a membership', () => {
  assert.equal(ownsGrandscapeMirrorPack(null), false);
  assert.equal(ownsGrandscapeMirrorPack({ entitlements: { active: {} } }), false);
  assert.equal(ownsGrandscapeMirrorPack({ entitlements: { active: { premium: { id: 'premium' } } } }), false);
  assert.equal(
    ownsGrandscapeMirrorPack({ entitlements: { active: { grandscape_mirror_pack: { id: 'grandscape_mirror_pack' } } } }),
    true,
  );
  assert.equal(activeCardFacePack('grandscape-mirror', false), null);
  assert.equal(activeCardFacePack(null, true), null);
  assert.equal(activeCardFacePack('grandscape-mirror', true), 'grandscape-mirror');
});

test('a stored pack survives hydration and a confirm made first is kept', () => {
  assert.equal(cardFacePackAfterHydration({ dirty: false, current: null, stored: 'grandscape-mirror' }), 'grandscape-mirror');
  assert.equal(cardFacePackAfterHydration({ dirty: false, current: null, stored: null }), null);
  assert.equal(cardFacePackAfterHydration({ dirty: false, current: null, stored: 'castle-cards' }), null);
  assert.equal(cardFacePackAfterHydration({ dirty: true, current: null, stored: 'grandscape-mirror' }), null);
  assert.equal(
    cardFacePackAfterHydration({ dirty: true, current: 'grandscape-mirror', stored: null }),
    'grandscape-mirror',
  );
});

test('the shop lists the pack at $4.99 and stays quiet when the product is missing', () => {
  assert.equal(GRANDSCAPE_MIRROR_PACK.productId, 'grandscape_mirror_pack');
  assert.equal(GRANDSCAPE_MIRROR_PACK.entitlementId, 'grandscape_mirror_pack');
  assert.equal(GRANDSCAPE_MIRROR_PACK.listPrice, '$4.99');
  assert.equal(GRANDSCAPE_MIRROR_PACK.name, 'Grandscape Mirror Pack');

  const missing = grandscapeShopView({ owns: false, equipped: false, priceString: null });
  assert.equal(missing.status, 'unavailable');
  assert.equal(missing.canPurchase, false);
  assert.equal(missing.priceLabel, '$4.99');
  assert.equal(missing.actionLabel, 'Unavailable');

  const blank = grandscapeShopView({ owns: false, equipped: false, priceString: '   ' });
  assert.equal(blank.status, 'unavailable');
  assert.equal(blank.canPurchase, false);

  const live = grandscapeShopView({ owns: false, equipped: false, priceString: '$4.99' });
  assert.equal(live.status, 'available');
  assert.equal(live.canPurchase, true);
  assert.equal(live.actionLabel, 'Buy $4.99');

  const owned = grandscapeShopView({ owns: true, equipped: false, priceString: null });
  assert.equal(owned.status, 'owned');
  assert.equal(owned.canEquip, true);
  assert.equal(owned.canPurchase, false);

  const equipped = grandscapeShopView({ owns: true, equipped: true, priceString: '$4.99' });
  assert.equal(equipped.status, 'equipped');
  assert.equal(equipped.canUnequip, true);
  assert.equal(equipped.canPurchase, false);
});

test('a missing or unpriced RevenueCat product does not throw and is not sellable', () => {
  assert.equal(findGrandscapePackage(null), null);
  assert.equal(findGrandscapePackage(undefined), null);
  assert.equal(findGrandscapePackage({ current: null, all: {} }), null);
  assert.equal(
    findGrandscapePackage({
      current: { availablePackages: [{ product: { identifier: 'vip_year', priceString: '$59.99' } }] },
    }),
    null,
  );
  assert.equal(
    findGrandscapePackage({
      current: {
        availablePackages: [{ product: { identifier: 'grandscape_mirror_pack', priceString: '' } }],
      },
    }),
    null,
  );
  assert.equal(
    findGrandscapePackage({
      current: { availablePackages: [{ product: null }] },
      all: { broken: null },
    }),
    null,
  );

  const found = findGrandscapePackage({
    current: { availablePackages: [{ product: { identifier: 'monthly_high_roller', priceString: '$6.99' } }] },
    all: {
      cosmetics: {
        availablePackages: [
          { product: { identifier: 'grandscape_mirror_pack', priceString: '  ' } },
          { product: { identifier: 'grandscape_mirror_pack', priceString: '$4.99' } },
        ],
      },
    },
  });
  assert.equal(found?.product?.priceString, '$4.99');
});

test('a cancelled store purchase is not a failure', () => {
  assert.equal(isStorePurchaseCancelled(null), false);
  assert.equal(isStorePurchaseCancelled(new Error('Purchase failed')), false);
  assert.equal(isStorePurchaseCancelled(new Error('User cancelled')), true);
  assert.equal(isStorePurchaseCancelled({ userCancelled: true, message: 'nope' }), true);
  assert.equal(isStorePurchaseCancelled({ code: 1, message: 'cancelled' }), true);
});
