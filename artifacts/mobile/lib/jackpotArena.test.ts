import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { jackpotArenaHtml } from '../components/jackpotArenaHtml';
import { jackpotArenaLandscapeHtml } from '../components/jackpotArenaLandscapeHtml';
import { sceneIdForArena } from './arenaScene';
import { isArenaPremium } from './arenaAccess';
import {
  JACKPOT_ARENA_ID,
  JACKPOT_ARENA_NAME,
  JACKPOT_BURST_SCRIPT,
  JACKPOT_FELT,
  JACKPOT_ORIGIN_WHITELIST,
  JACKPOT_LIVE_MESSAGE,
  isJackpotLiveMessage,
  jackpotBackdrop,
  jackpotLoadAllowed,
  jackpotPage,
  shouldMountJackpotWebView,
  withJackpotLiveSignal,
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

test('the embedded arena has no external loads and keeps the tuned burst', () => {
  for (const file of ['jackpotArenaHtml.ts', 'jackpotArenaLandscapeHtml.ts']) {
    const source = fs.readFileSync(path.join(__dirname, '../components', file), 'utf8');
    assert.equal(source.includes('http://'), false, file);
    assert.equal(source.includes('https://'), false, file);
    assert.equal(source.includes('window.castleJackpot'), true, file);
  }
  const portrait = fs.readFileSync(path.join(__dirname, '../components/jackpotArenaHtml.ts'), 'utf8');
  assert.equal(portrait.includes('ticker 0.58'), true);
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

test('the still is a fallback, and the live signal does not retune the page', () => {
  assert.equal(jackpotBackdrop({ reduceMotion: null, failed: false }), 'hold');
  assert.equal(jackpotBackdrop({ reduceMotion: false, failed: false }), 'live');
  assert.equal(jackpotBackdrop({ reduceMotion: true, failed: false }), 'still');
  assert.equal(jackpotBackdrop({ reduceMotion: false, failed: true }), 'still');
  assert.equal(isJackpotLiveMessage(JACKPOT_LIVE_MESSAGE), true);
  assert.equal(isJackpotLiveMessage('ready'), false);

  for (const file of ['jackpotArenaHtml.ts', 'jackpotArenaLandscapeHtml.ts']) {
    const source = fs.readFileSync(path.join(__dirname, '../components', file), 'utf8');
    assert.equal(source.includes(JACKPOT_LIVE_MESSAGE), false, file);
  }
  const signaled = withJackpotLiveSignal(jackpotArenaHtml);
  assert.equal(signaled.includes('ticker 0.58'), true);
  assert.equal(signaled.includes('counter 0.81'), true);
  assert.equal(signaled.includes('sheen 0.14'), true);
  assert.equal(signaled.includes('glow 0.63'), true);
  assert.equal(signaled.includes(JACKPOT_LIVE_MESSAGE), true);
  const landscape = withJackpotLiveSignal(jackpotArenaLandscapeHtml);
  assert.equal(landscape.includes('const IMGAR=1.7768331562167907;'), true);
  assert.equal(landscape.includes(JACKPOT_LIVE_MESSAGE), true);
  assert.equal(landscape.includes('uSheen'), true);
  assert.equal(jackpotArenaLandscapeHtml.includes('style="opacity:0"'), false);
  assert.equal(landscape.includes('<img id="art" alt="" style="opacity:0"/>'), true);
});

test('the WebView mounts only for a live Jackpot match', () => {
  const live = { arenaActive: true, appActive: true, reduceMotion: false, failed: false };
  assert.equal(shouldMountJackpotWebView(live), true);
  assert.equal(shouldMountJackpotWebView({ ...live, arenaActive: false }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, appActive: false }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, reduceMotion: true }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, failed: true }), false);
});
