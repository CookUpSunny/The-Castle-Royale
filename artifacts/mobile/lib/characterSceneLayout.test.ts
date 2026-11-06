import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PLAYER_SCENE_WIDTH,
  SCENE_OPACITY,
  handLane,
  landscapePlayerScene,
  landscapeStaysInColumn,
  portraitPlayerScene,
} from './characterSceneLayout';

test('the portrait plate stays in the left corner and an 18-card hand clears it', () => {
  const scene = portraitPlayerScene(0, 34);
  assert.equal(scene.left, 0);
  assert.equal(scene.fit, 'contain');
  assert.ok(scene.opacity >= 0.9);
  assert.equal(scene.opacity, SCENE_OPACITY);
  assert.ok(scene.width > 54);
  assert.equal(scene.width, PLAYER_SCENE_WIDTH);
  for (const screen of [375, 390, 430]) {
    const lane = handLane(screen, scene.width);
    assert.ok(lane.cardLeft >= scene.width + 6, `${screen} card ${lane.cardLeft}`);
    assert.ok(lane.cardRight <= screen - 4, `${screen} right ${lane.cardRight}`);
    assert.ok(lane.fanWidth >= 160);
  }
});

test('the landscape plate stays inside the left column beside the hand', () => {
  const scene = landscapePlayerScene(0, 12, 110);
  assert.equal(landscapeStaysInColumn(scene, 0, 110), true);
  assert.equal(scene.fit, 'contain');
  assert.ok(scene.width <= 110);
  assert.ok(scene.height < scene.width);
});
