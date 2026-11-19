import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  SHOP_DOORWAY_MOTION_BUDGET_MS,
  SHOP_DOORWAY_MS,
  canEnterShop,
  canLeaveShop,
  doorwayHapticOnOpen,
  entranceChoreographyMs,
  exitChoreographyMs,
  exitOrientationTarget,
  exitShouldCover,
  orientationMatches,
  shouldAnimateShopEntrance,
  stepDoorway,
  waitForOrientation,
  waitForPresentation,
} from './shopDoorway';

const root = path.join(__dirname, '..');

test('the doorway choreography stays under the budget, cover included', () => {
  assert.equal(entranceChoreographyMs(false), 1660);
  assert.ok(entranceChoreographyMs(false) <= SHOP_DOORWAY_MOTION_BUDGET_MS);
  assert.ok(entranceChoreographyMs(true) < entranceChoreographyMs(false));
  assert.equal(entranceChoreographyMs(true), SHOP_DOORWAY_MS.reducedCover + SHOP_DOORWAY_MS.reducedReveal);
  assert.equal(exitChoreographyMs(false), SHOP_DOORWAY_MS.exitFlood + SHOP_DOORWAY_MS.toBlack + SHOP_DOORWAY_MS.exitReveal);
  assert.ok(exitChoreographyMs(false) < entranceChoreographyMs(false));
  assert.equal(SHOP_DOORWAY_MS.orientationCap, 1800);
  assert.equal(SHOP_DOORWAY_MS.settle, 280);
  assert.equal(SHOP_DOORWAY_MS.card, 350);
  assert.equal(SHOP_DOORWAY_MS.doors, 300);
  assert.equal(SHOP_DOORWAY_MS.push, 250);
  assert.equal(SHOP_DOORWAY_MS.toBlack, 280);
  assert.equal(SHOP_DOORWAY_MS.reveal, 480);
});

test('a second tap does not restart the doorway', () => {
  assert.equal(canEnterShop('idle'), true);
  assert.equal(canEnterShop('enter'), false);
  assert.equal(canEnterShop('covered'), false);
  assert.equal(canEnterShop('reveal'), false);
  assert.equal(canEnterShop('exit'), false);
  assert.equal(canLeaveShop('idle'), true);
  assert.equal(canLeaveShop('enter'), false);

  let phase = stepDoorway('idle', 'enter');
  phase = stepDoorway(phase, 'enter');
  phase = stepDoorway(phase, 'exit');
  assert.equal(phase, 'enter');
  phase = stepDoorway(phase, 'settled');
  assert.equal(phase, 'enter');
  phase = stepDoorway(phase, 'covered');
  assert.equal(phase, 'covered');
  phase = stepDoorway(phase, 'enter');
  phase = stepDoorway(phase, 'settled');
  assert.equal(phase, 'reveal');
  phase = stepDoorway(phase, 'reveal-done');
  assert.equal(phase, 'idle');
});

test('leaving the shop is a shorter covered return, and it can settle', () => {
  let phase = stepDoorway('idle', 'exit');
  phase = stepDoorway(phase, 'exit');
  phase = stepDoorway(phase, 'covered');
  assert.equal(phase, 'exit');
  phase = stepDoorway(phase, 'exit-covered');
  assert.equal(phase, 'exit-covered');
  phase = stepDoorway(phase, 'settled');
  assert.equal(phase, 'exit-reveal');
  phase = stepDoorway(phase, 'reveal-done');
  assert.equal(phase, 'idle');
});

test('the entrance plays from portrait only, and the exit covers a return to portrait', () => {
  assert.equal(shouldAnimateShopEntrance(390, 844), true);
  assert.equal(shouldAnimateShopEntrance(844, 390), false);
  assert.equal(exitShouldCover(true, 844, 390), true);
  assert.equal(exitShouldCover(true, 390, 844), false);
  assert.equal(exitShouldCover(false, 844, 390), false);
  assert.equal(exitShouldCover(null, 844, 390), true);
  assert.equal(exitShouldCover(null, 390, 844), false);
  assert.equal(exitOrientationTarget(844, 390), 'portrait');
  assert.equal(exitOrientationTarget(390, 844), 'landscape');
  assert.equal(doorwayHapticOnOpen(false), true);
  assert.equal(doorwayHapticOnOpen(true), false);
});

test('orientation matching ignores a square window', () => {
  assert.equal(orientationMatches(844, 390, 'landscape'), true);
  assert.equal(orientationMatches(390, 844, 'portrait'), true);
  assert.equal(orientationMatches(390, 844, 'landscape'), false);
  assert.equal(orientationMatches(400, 400, 'landscape'), false);
  assert.equal(orientationMatches(0, 800, 'portrait'), false);
});

test('the orientation wait resolves on a dimension change and caps when it never comes', async () => {
  const already = await waitForOrientation('landscape', 500, {
    getSize: () => ({ width: 844, height: 390 }),
    subscribeDimensions: () => () => {},
    subscribeOrientation: () => () => {},
  });
  assert.equal(already, 'matched');

  let push: (width: number, height: number) => void = () => {};
  const pending = waitForOrientation('portrait', 400, {
    getSize: () => ({ width: 844, height: 390 }),
    subscribeDimensions: (onSize) => {
      push = onSize;
      return () => {};
    },
    subscribeOrientation: () => () => {},
  });
  setTimeout(() => push(390, 844), 20);
  assert.equal(await pending, 'matched');

  const timedOut = await waitForOrientation('landscape', 30, {
    getSize: () => ({ width: 390, height: 844 }),
    subscribeDimensions: () => () => {},
    subscribeOrientation: () => () => {},
  });
  assert.equal(timedOut, 'timeout');
});

test('the reveal waits for a ready scene and a settled landscape, and the cap still wins', async () => {
  let width = 390;
  let height = 844;
  let ready = false;
  let pushSize = () => {};
  let markReady = () => {};
  const pending = waitForPresentation('landscape', 400, {
    getSize: () => ({ width, height }),
    subscribeDimensions: (onSize) => {
      pushSize = () => onSize(width, height);
      return () => {};
    },
    subscribeOrientation: () => () => {},
    isSceneReady: () => ready,
    subscribeSceneReady: (onReady) => {
      markReady = () => {
        ready = true;
        onReady();
      };
      return () => {};
    },
  }, { settleMs: 40 });

  setTimeout(() => {
    width = 844;
    height = 390;
    pushSize();
  }, 15);
  setTimeout(() => markReady(), 30);
  assert.equal(await pending, 'matched');

  const capped = await waitForPresentation('landscape', 30, {
    getSize: () => ({ width: 390, height: 844 }),
    subscribeDimensions: () => () => {},
    subscribeOrientation: () => () => {},
    isSceneReady: () => false,
    subscribeSceneReady: () => () => {},
  }, { settleMs: 20 });
  assert.equal(capped, 'timeout');
});

test('a quiet presentation does not wait on a scene that never rotates', async () => {
  const quiet = await waitForPresentation('portrait', 400, {
    getSize: () => ({ width: 844, height: 390 }),
    subscribeDimensions: () => () => {},
    subscribeOrientation: () => () => {},
    isSceneReady: () => false,
    subscribeSceneReady: () => () => {},
  }, { quietMs: 25, settleMs: 200 });
  assert.equal(quiet, 'quiet');
});

test('a quiet exit does not hold the cover when the window never rotates', async () => {
  const quiet = await waitForOrientation('portrait', 400, {
    getSize: () => ({ width: 844, height: 390 }),
    subscribeDimensions: () => () => {},
    subscribeOrientation: () => () => {},
  }, 25);
  assert.equal(quiet, 'quiet');
});

test('the shop doorway replaces a second curtain instead of stacking on the match one', () => {
  const doorway = fs.readFileSync(path.join(root, 'components/ShopDoorway.tsx'), 'utf8');
  const entrance = fs.readFileSync(path.join(root, 'contexts/ShopEntranceContext.tsx'), 'utf8');
  const shop = fs.readFileSync(path.join(root, 'components/RoyalShop.tsx'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'app/(tabs)/index.tsx'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'app/settings.tsx'), 'utf8');
  const layout = fs.readFileSync(path.join(root, 'app/_layout.tsx'), 'utf8');
  const game = fs.readFileSync(path.join(root, 'app/game.tsx'), 'utf8');
  const curtain = fs.readFileSync(path.join(root, 'components/OrientationCurtain.tsx'), 'utf8');

  assert.equal(doorway.includes("components/OrientationCurtain"), false);
  assert.equal(/<OrientationCurtain/.test(doorway), false);
  assert.equal(shop.includes('OrientationCurtain'), false);
  assert.equal(entrance.includes("components/OrientationCurtain"), false);
  assert.equal(/<OrientationCurtain/.test(entrance), false);
  assert.match(game, /<OrientationCurtain/);
  assert.match(curtain, /export default function OrientationCurtain/);

  assert.match(doorway, /scheduleOnRN/);
  assert.equal(doorway.includes('runOnJS'), false);
  assert.equal(doorway.includes('playSfx'), false);
  assert.match(doorway, /ReduceMotion\.Never/);
  assert.match(doorway, /ImpactFeedbackStyle\.Light/);
  assert.match(doorway, /rotateY/);
  assert.match(doorway, /backgroundColor: '#000'/);
  assert.match(doorway, /Easing\.bezier\(0\.23, 1, 0\.32, 1\)/);
  assert.equal(doorway.includes('cubic-bezier('), false);
  assert.equal(entrance.includes('cubic-bezier('), false);
  assert.match(entrance, /waitForPresentation/);
  assert.match(entrance, /reportShopScene/);
  assert.match(entrance, /orientationCap/);
  assert.match(shop, /reportShopScene/);
  assert.match(shop, /ShopCrossfade/);
  assert.match(shop, /ShopBackButton/);
  assert.match(shop, /playSfx\('shop-back'\)/);
  assert.match(shop, /playSfx\('shop-tab'\)/);
  assert.match(shop, /playSfx\('shop-tap'\)/);
  assert.match(shop, /playSfx\('shop-equip'\)/);
  assert.equal(/<BackButton/.test(shop), false);
  const crossfade = fs.readFileSync(path.join(root, 'components/ShopCrossfade.tsx'), 'utf8');
  const back = fs.readFileSync(path.join(root, 'components/ShopBackButton.tsx'), 'utf8');
  for (const source of [doorway, entrance, shop, crossfade, back]) {
    assert.equal(source.includes('cubic-bezier('), false);
    assert.equal(source.includes('transitionProperty'), false);
  }
  assert.match(crossfade, /withTiming/);
  assert.match(back, /SHOP_BACK_VARIANT/);
  assert.match(layout, /ShopEntranceProvider/);
  assert.match(home, /openShopFrom/);
  assert.equal(home.includes("router.push('/store')"), false);
  assert.match(settings, /openShopFrom/);
  assert.equal(settings.includes('router.push("/store")'), false);
  assert.match(shop, /leaveShop\(/);
  assert.match(shop, /OrientationLock\.LANDSCAPE/);
  assert.match(layout, /name="store"/);
  assert.match(layout, /animation: 'none'/);
});
