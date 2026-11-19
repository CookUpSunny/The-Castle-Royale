import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.join(__dirname, '..');

test('approved shop cues are preloaded, muted with the app, and never thrown into a tap', () => {
  const sfx = fs.readFileSync(path.join(root, 'lib/sfx.ts'), 'utf8');
  const shop = fs.readFileSync(path.join(root, 'components/RoyalShop.tsx'), 'utf8');
  const doorway = fs.readFileSync(path.join(root, 'components/ShopDoorway.tsx'), 'utf8');
  const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');

  for (const file of ['shop-tap.mp3', 'shop-tab.mp3', 'shop-back.mp3', 'shop-equip.mp3']) {
    assert.equal(fs.existsSync(path.join(root, 'assets/audio', file)), true, file);
    assert.match(sfx, new RegExp(`assets/audio/${file}`));
  }

  assert.match(sfx, /playsInSilentMode: false/);
  assert.match(sfx, /if \(muted \|\| !_audio\) return/);
  assert.match(sfx, /setSfxMuted/);
  assert.match(sfx, /preloadSfx/);
  assert.match(layout, /preloadSfx\(\)/);
  assert.match(shop, /preloadSfx\(\)/);
  assert.equal(doorway.includes('playSfx'), false);
  assert.equal(sfx.includes('cubic-bezier('), false);
});
