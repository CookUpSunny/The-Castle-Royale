import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Effective Expo iOS config must not request a MusicKit provisioning entitlement.
 * MusicKit stays an App Service plus NSAppleMusicUsageDescription, with the
 * local native module and the bundled-audio fallback still wired up.
 */
const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(projectRoot, '../..');

const USAGE_DESCRIPTION =
  'Castle Royale streams arena songs from Apple Music so the artist is paid for the play. Apple Music is optional. Built-in music plays if you decline or cannot stream.';

const FORBIDDEN_ENTITLEMENTS = [
  'com.apple.developer.musickit',
  'com.apple.developer.music-kit',
  'com.apple.developer.applemusickit',
];

type Json = Record<string, unknown>;

function readJson(filePath: string): Json {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Json;
}

function forbiddenKeys(value: unknown, trail = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  const hits: string[] = [];
  for (const [key, child] of Object.entries(value as Json)) {
    const next = trail ? `${trail}.${key}` : key;
    if (FORBIDDEN_ENTITLEMENTS.includes(key) || /musickit|music-kit|applemusickit/i.test(key)) {
      hits.push(next);
    }
    hits.push(...forbiddenKeys(child, next));
  }
  return hits;
}

function pluginNames(plugins: unknown): string[] {
  if (!Array.isArray(plugins)) return [];
  return plugins.map((plugin) => (Array.isArray(plugin) ? String(plugin[0]) : String(plugin)));
}

test('effective Expo iOS config keeps MusicKit without a provisioning entitlement', async () => {
  const { getConfig } = require('@expo/config') as {
    getConfig: (
      root: string,
      options: { skipSDKVersionRequirement: boolean; isModdedConfig: boolean },
    ) => { exp: Json & { ios?: Json; plugins?: unknown; mods?: unknown } };
  };
  const { compileModsAsync } = require('@expo/config-plugins') as {
    compileModsAsync: (
      config: Json,
      props: {
        projectRoot: string;
        platforms: string[];
        introspect: boolean;
        ignoreExistingNativeFiles: boolean;
      },
    ) => Promise<Json & { _internal?: { modResults?: { ios?: { entitlements?: Json; infoPlist?: Json } } } }>;
  };

  const appJson = readJson(path.join(projectRoot, 'app.json'));
  const app = appJson.expo as Json;
  const ios = app.ios as Json;
  assert.equal(ios.bundleIdentifier, 'app.replit.thecastleroyale');
  assert.equal((ios.infoPlist as Json).NSAppleMusicUsageDescription, USAGE_DESCRIPTION);
  assert.equal(ios.entitlements, undefined);
  assert.deepEqual(forbiddenKeys(appJson), []);

  const { exp } = getConfig(projectRoot, {
    skipSDKVersionRequirement: true,
    isModdedConfig: true,
  });
  assert.equal(exp.ios?.bundleIdentifier, 'app.replit.thecastleroyale');
  assert.equal((exp.ios?.infoPlist as Json | undefined)?.NSAppleMusicUsageDescription, USAGE_DESCRIPTION);
  assert.equal(exp.ios?.entitlements, undefined);
  assert.deepEqual(forbiddenKeys(exp.ios?.entitlements), []);
  assert.ok(
    pluginNames(exp.plugins).includes('./plugins/withAppleMusicKit'),
    'withAppleMusicKit must stay in the evaluated plugin list',
  );

  const compiled = await compileModsAsync(exp, {
    projectRoot,
    platforms: ['ios'],
    introspect: true,
    ignoreExistingNativeFiles: true,
  });
  const modResults = compiled._internal?.modResults?.ios;
  const entitlements = modResults?.entitlements ?? {};
  const infoPlist = modResults?.infoPlist;
  assert.ok(infoPlist, 'introspected Info.plist mod did not run');
  assert.equal(infoPlist.NSAppleMusicUsageDescription, USAGE_DESCRIPTION);
  assert.deepEqual(
    forbiddenKeys(entitlements),
    [],
    `effective entitlements still request MusicKit: ${JSON.stringify(entitlements)}`,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(entitlements, 'com.apple.developer.musickit'),
    false,
  );

  const pluginSource = fs.readFileSync(path.join(projectRoot, 'plugins/withAppleMusicKit.js'), 'utf8');
  assert.equal(pluginSource.includes('withEntitlementsPlist'), false);
  assert.equal(pluginSource.includes('NSAppleMusicUsageDescription'), true);
  assert.equal(pluginSource.includes(USAGE_DESCRIPTION), true);

  const appConfigSource = fs.readFileSync(path.join(projectRoot, 'app.config.js'), 'utf8');
  assert.equal(appConfigSource.includes('./plugins/withAppleMusicKit'), true);
  assert.deepEqual(forbiddenKeys(readJson(path.join(repoRoot, 'eas.json'))), []);

  const strayEntitlements = path.join(repoRoot, 'ios/workspace/workspace.entitlements');
  const stray = fs.readFileSync(strayEntitlements, 'utf8');
  for (const key of FORBIDDEN_ENTITLEMENTS) {
    assert.equal(stray.includes(key), false, `${strayEntitlements} contains ${key}`);
  }
});

test('MusicKit native playback and bundled fallback stay integrated', () => {
  const mobilePackage = readJson(path.join(projectRoot, 'package.json'));
  const autolinking = (mobilePackage.expo as Json).autolinking as Json;
  assert.equal(autolinking.nativeModulesDir, './modules');

  const moduleConfig = readJson(
    path.join(projectRoot, 'modules/castle-musickit/expo-module.config.json'),
  );
  const apple = moduleConfig.apple as Json;
  assert.deepEqual(apple.modules, ['CastleMusicKitModule']);

  const swift = fs.readFileSync(
    path.join(projectRoot, 'modules/castle-musickit/ios/CastleMusicKitModule.swift'),
    'utf8',
  );
  assert.equal(swift.includes('import MusicKit'), true);
  assert.equal(swift.includes('ApplicationMusicPlayer'), true);
  assert.equal(swift.includes('MusicAuthorization.request'), true);

  const musicContext = fs.readFileSync(path.join(projectRoot, 'contexts/MusicContext.tsx'), 'utf8');
  assert.equal(musicContext.includes("from '../modules/castle-musickit/src'"), true);
  assert.equal(musicContext.includes("'musickit'"), true);
  assert.equal(musicContext.includes('expo-audio'), true);

  const catalog = fs.readFileSync(path.join(projectRoot, 'lib/appleMusicCatalog.ts'), 'utf8');
  assert.equal(catalog.includes("backend: 'musickit'"), true);
  assert.equal(catalog.includes("backend: 'bundled'"), true);
});
