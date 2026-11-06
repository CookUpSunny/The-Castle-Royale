import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  CARD_SKINS,
  IMAGE_CARD_BACKS,
  canEquipCardSkin,
  resolveStoredCardSkin,
} from './cardSkins';

const byId = new Map(CARD_SKINS.map((skin) => [skin.id, skin]));

test('the original ten skins keep their free and premium flags', () => {
  assert.equal(byId.get('neon-glow')?.unlocked, true);
  assert.equal(byId.get('royal-gold')?.unlocked, true);
  assert.equal(byId.get('crystal-ice')?.unlocked, true);
  assert.equal(byId.get('sakura-blossom')?.unlocked, true);
  assert.equal(byId.get('inferno-flame')?.unlocked, true);
  assert.equal(byId.get('midnight-void')?.unlocked, false);
  assert.equal(byId.get('emerald-prestige')?.unlocked, false);
  assert.equal(byId.get('pearl-white')?.unlocked, false);
  assert.equal(byId.get('cyber-punk')?.unlocked, false);
  assert.equal(byId.get('vintage-casino')?.unlocked, false);
});

test('eight image backs are registered unlocked for preview and the files exist', () => {
  assert.equal(IMAGE_CARD_BACKS.length, 8);
  assert.deepEqual(
    IMAGE_CARD_BACKS.map((skin) => skin.name),
    [
      'Atlas Red',
      'Castle Cards',
      'Queen\u2019s Hand',
      'Coat of Arms',
      'Big Winner',
      'Lady Luck',
      'Gold Obsession',
      'Royal Treasure Crest',
    ],
  );
  for (const skin of IMAGE_CARD_BACKS) {
    assert.equal(skin.unlocked, true);
    assert.equal(byId.get(skin.id)?.name, skin.name);
    assert.equal(byId.get(skin.id)?.unlocked, true);
    const file = path.join(__dirname, '../assets/cardbacks', skin.file);
    assert.equal(fs.existsSync(file), true, file);
  }
  assert.equal(CARD_SKINS.length, 18);
});

test('stored image skins resolve, and locked or unknown skins stay on Royal Gold', () => {
  assert.deepEqual(resolveStoredCardSkin(null), { skin: 'royal-gold', migrate: false });
  assert.deepEqual(resolveStoredCardSkin('royal-gold'), { skin: 'royal-gold', migrate: false });
  assert.deepEqual(resolveStoredCardSkin('atlas-red'), { skin: 'atlas-red', migrate: false });
  assert.deepEqual(resolveStoredCardSkin('royal-treasure-crest'), { skin: 'royal-treasure-crest', migrate: false });
  assert.deepEqual(resolveStoredCardSkin('midnight-void'), { skin: 'royal-gold', migrate: false });
  assert.deepEqual(resolveStoredCardSkin('not-a-skin'), { skin: 'royal-gold', migrate: false });
  assert.deepEqual(resolveStoredCardSkin('classic'), { skin: 'neon-glow', migrate: true });
  assert.deepEqual(resolveStoredCardSkin('royal'), { skin: 'royal-gold', migrate: true });
  assert.deepEqual(resolveStoredCardSkin('cosmic'), { skin: 'royal-gold', migrate: false });
});

test('subscribers can still equip a locked procedural skin, and image backs do not need one', () => {
  assert.equal(canEquipCardSkin('midnight-void', false), false);
  assert.equal(canEquipCardSkin('midnight-void', true), true);
  assert.equal(canEquipCardSkin('royal-gold', false), true);
  assert.equal(canEquipCardSkin('neon-glow', false), true);
  assert.equal(canEquipCardSkin('queens-hand', false), true);
  assert.equal(canEquipCardSkin('gold-obsession', false), true);
});
