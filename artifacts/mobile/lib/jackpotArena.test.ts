import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { isArenaPremium } from './arenaAccess';
import {
  JACKPOT_ARENA_ID,
  JACKPOT_ARENA_NAME,
  JACKPOT_BURST_SCRIPT,
  JACKPOT_FELT,
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

test('the WebView mounts only for a live Jackpot match', () => {
  const live = { arenaActive: true, appActive: true, reduceMotion: false, failed: false };
  assert.equal(shouldMountJackpotWebView(live), true);
  assert.equal(shouldMountJackpotWebView({ ...live, arenaActive: false }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, appActive: false }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, reduceMotion: true }), false);
  assert.equal(shouldMountJackpotWebView({ ...live, failed: true }), false);
});
