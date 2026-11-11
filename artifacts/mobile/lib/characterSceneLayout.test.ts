import assert from 'node:assert/strict';
import test from 'node:test';

import { computeFanPositions, FAN_CONTAINER_H } from './fanLayout';
import {
  CORNER_OPACITY,
  CORNER_SCALE,
  PLAYER_MENU_HIT,
  landscapeMenuButton,
  landscapeOpponentCorner,
  landscapePlayerCorner,
  portraitMenuButton,
  portraitOpponentCorner,
  portraitPlayerCorner,
  togglePlayerMenu,
} from './characterSceneLayout';

test('corner figures bleed off the screen and stay translucent', () => {
  const player = portraitPlayerCorner(390, 844);
  const opponent = portraitOpponentCorner(390, 844);
  assert.ok(player.left! < 0);
  assert.ok(player.bottom! < 0);
  assert.ok(opponent.top! < 0);
  assert.ok(opponent.right! < 0);
  assert.equal(player.pointerEvents, 'none');
  assert.equal(opponent.pointerEvents, 'none');
  assert.ok(player.opacity >= 0.55 && player.opacity <= 0.7);
  assert.equal(player.opacity, CORNER_OPACITY);
  assert.equal(player.fit, 'contain');

  const landPlayer = landscapePlayerCorner(844, 390);
  const landOpponent = landscapeOpponentCorner(844, 390);
  assert.ok(landPlayer.left! < 0 && landPlayer.bottom! < 0);
  assert.ok(landOpponent.top! < 0 && landOpponent.right! < 0);
  assert.equal(landPlayer.pointerEvents, 'none');
});

test('corner figures are fifteen percent smaller than the first cut', () => {
  const player = portraitPlayerCorner(390, 844);
  const rawWidth = Math.round(Math.min(280, Math.max(200, 390 * 0.62)));
  const rawHeight = Math.round(Math.min(844 * 0.46, rawWidth * 1.28));
  assert.equal(player.width, Math.round(rawWidth * CORNER_SCALE));
  assert.equal(player.height, Math.round(rawHeight * CORNER_SCALE));
  assert.ok(player.width < rawWidth);
  const opponent = portraitOpponentCorner(390, 844);
  const opponentRaw = Math.round(Math.min(230, Math.max(160, 390 * 0.48)));
  assert.equal(opponent.width, Math.round(opponentRaw * CORNER_SCALE));
  const land = landscapePlayerCorner(844, 390);
  const landRawH = Math.round(Math.min(390 * 0.72, 280));
  assert.equal(land.height, Math.round(landRawH * CORNER_SCALE));
});

test('an 18-card fan keeps the unshifted spread from main', () => {
  const placed = computeFanPositions(18, 390);
  const left = Math.min(...placed.map((card) => card.left));
  const right = Math.max(...placed.map((card) => card.left));
  assert.ok(left < 80, `fan was shifted to ${left}`);
  assert.ok(Math.abs(left - 39.9) < 1);
  assert.ok(Math.abs(right - 284.1) < 1);
  assert.equal(placed.length, 18);
});

test('the menu button opens the name and sound menu without covering the hand', () => {
  assert.equal(togglePlayerMenu(false), true);
  assert.equal(togglePlayerMenu(true), false);

  const button = portraitMenuButton(0, 34);
  assert.equal(button.opens, 'playerMenu');
  assert.ok(button.width >= 44 && button.height >= 44);
  assert.equal(button.width, PLAYER_MENU_HIT);
  const handTop = 34 + FAN_CONTAINER_H;
  assert.ok(button.bottom >= handTop, 'button overlaps the fan');

  const land = landscapeMenuButton(47, 21);
  assert.equal(land.opens, 'playerMenu');
  assert.equal(land.left, 57);
  assert.equal(land.bottom, 31);
  assert.ok(land.left + land.width < 47 + 90, 'button crosses into the hand column');
});
