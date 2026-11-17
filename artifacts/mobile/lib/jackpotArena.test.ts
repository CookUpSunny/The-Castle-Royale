import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { sceneIdForArena } from './arenaScene';
import { isArenaPremium } from './arenaAccess';
import {
  JACKPOT_ARENA_ID,
  JACKPOT_ARENA_NAME,
  JACKPOT_BURST_SCRIPT,
  JACKPOT_FELT,
  JACKPOT_MAX_DPR,
  JACKPOT_ORIGIN_WHITELIST,
  jackpotLoadAllowed,
  jackpotPage,
  shouldMountJackpotWebView,
} from './jackpotArena';

test('Jackpot keeps Casino Green’s id and stays free', () => {
  assert.equal(JACKPOT_ARENA_ID, 'greenTable');
  assert.equal(JACKPOT_ARENA_NAME, 'Jackpot');
  assert.equal(isArenaPremium('greenTable'), false);
  assert.equal(JACKPOT_FELT, '#06120c');
  assert.equal(sceneIdForArena('greenTable'), 'casinoGreen');
  assert.equal(sceneIdForArena('cosmic'), 'cosmicSanctum');
  assert.equal(sceneIdForArena('classic'), 'flamingoFloor');
  assert.equal(sceneIdForArena('matrix'), 'matrixArena');
  assert.equal(sceneIdForArena('rainbowRoad'), 'rainbowRoad');
  assert.equal(jackpotPage(844, 390), 'landscape');
  assert.equal(jackpotPage(390, 844), 'portrait');
});

test('the arena pages are assets, cap pixels at 2x, and keep the tuned burst', () => {
  assert.equal(JACKPOT_MAX_DPR, 2);
  assert.equal(fs.existsSync(path.join(__dirname, '../components/jackpotArenaHtml.ts')), false);
  assert.equal(fs.existsSync(path.join(__dirname, '../components/jackpotArenaLandscapeHtml.ts')), false);
  for (const file of ['portrait.html', 'landscape.html']) {
    const source = fs.readFileSync(path.join(__dirname, '../assets/jackpot', file), 'utf8');
    assert.equal(source.includes('http://'), false, file);
    assert.equal(source.includes('https://'), false, file);
    assert.equal(source.includes('window.castleJackpot'), true, file);
    assert.equal(source.includes(`Math.min(window.devicePixelRatio||1,${JACKPOT_MAX_DPR})`), true, file);
    assert.equal(source.includes('Math.min(window.devicePixelRatio||1,3)'), false, file);
  }
  const portrait = fs.readFileSync(path.join(__dirname, '../assets/jackpot/portrait.html'), 'utf8');
  assert.equal(portrait.includes('ticker 0.58'), true);
  const landscape = fs.readFileSync(path.join(__dirname, '../assets/jackpot/landscape.html'), 'utf8');
  assert.equal(landscape.includes('Jackpot Spin (Landscape)'), true);
  assert.equal(JACKPOT_BURST_SCRIPT.includes('window.castleJackpot()'), true);
  assert.deepEqual(JACKPOT_ORIGIN_WHITELIST, ['about:blank', 'data:']);
  assert.equal(jackpotLoadAllowed('about:blank'), true);
  assert.equal(jackpotLoadAllowed(''), true);
  assert.equal(jackpotLoadAllowed('data:text/html,hi'), true);
  assert.equal(jackpotLoadAllowed('https://example.com'), false);
});

test('landscape is the wide page and rotation changes the key', () => {
  assert.equal(jackpotPage(390, 844), 'portrait');
  assert.equal(jackpotPage(844, 390), 'landscape');
  assert.equal(jackpotPage(844, 844), 'portrait');
});

test('the WebView mounts only for a live Jackpot match', () => {
  const live = { arenaActive: true, appActive: true, reduceMotion: false, failed: false };
  assert.equal(shouldMountJackpotWebView(live), true);
  assert.equal(shouldMountJackpotWebView({ ...live, arenaActive: false }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, appActive: false }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, reduceMotion: true }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, failed: true }), false);
});
