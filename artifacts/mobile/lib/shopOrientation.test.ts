import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { restoredShopOrientationLock } from './shopOrientation';

test('closing the shop restores the previous orientation lock', () => {
  assert.equal(restoredShopOrientationLock(null), 'DEFAULT');
  assert.equal(restoredShopOrientationLock(undefined), 'DEFAULT');
  assert.equal(restoredShopOrientationLock(''), 'DEFAULT');
  assert.equal(restoredShopOrientationLock('UNKNOWN'), 'DEFAULT');
  assert.equal(restoredShopOrientationLock('OTHER'), 'DEFAULT');
  assert.equal(restoredShopOrientationLock('DEFAULT'), 'DEFAULT');
  assert.equal(restoredShopOrientationLock('LANDSCAPE'), 'LANDSCAPE');
  assert.equal(restoredShopOrientationLock('PORTRAIT_UP'), 'PORTRAIT_UP');
});

test('only the shop locks the screen, and the match boards do not', () => {
  const shop = fs.readFileSync(path.join(__dirname, '../components/RoyalShop.tsx'), 'utf8');
  const game = fs.readFileSync(path.join(__dirname, '../app/game.tsx'), 'utf8');
  const landscape = fs.readFileSync(path.join(__dirname, '../components/GameLandscape.tsx'), 'utf8');
  assert.match(shop, /OrientationLock\.LANDSCAPE/);
  assert.match(shop, /restoredShopOrientationLock/);
  assert.equal(game.includes('expo-screen-orientation'), false);
  assert.equal(game.includes('lockAsync'), false);
  assert.equal(landscape.includes('expo-screen-orientation'), false);
  assert.equal(landscape.includes('lockAsync'), false);
});
