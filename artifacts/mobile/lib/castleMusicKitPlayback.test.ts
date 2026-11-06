import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * Source check for the MusicKit queue watchdog.
 *
 * EAS SDK 55 compiles this module with Xcode 26.2. Apple's
 * MusicPlayer.PlaybackStatus has no `seeking` case. Scrubbing is
 * `seekingForward` or `seekingBackward` (iOS 15+). This file cannot be
 * typechecked by swiftc here; the assertions lock the switch the compiler
 * accepts and the pause/stop behavior around it.
 */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swiftPath = path.join(projectRoot, 'modules/castle-musickit/ios/CastleMusicKitModule.swift');

const DOCUMENTED_CASES = [
  'playing',
  'paused',
  'stopped',
  'interrupted',
  'seekingForward',
  'seekingBackward',
] as const;

function stripSwiftComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function functionBody(source: string, name: string): string {
  const marker = `func ${name}`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing ${name}`);
  const brace = source.indexOf('{', start);
  assert.ok(brace >= 0, `${name} has no body`);
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, i);
    }
  }
  assert.fail(`${name} body did not close`);
}

test('PlaybackStatus switch uses the documented cases and does not invent seeking', () => {
  const raw = fs.readFileSync(swiftPath, 'utf8');
  const code = stripSwiftComments(raw);
  const transport = functionBody(code, 'transportInProgress');

  assert.match(
    transport,
    /case \.playing, \.seekingForward, \.seekingBackward:\s*return true/,
  );
  assert.match(
    transport,
    /case \.paused, \.stopped, \.interrupted:\s*return false/,
  );
  assert.match(transport, /@unknown default:\s*return false/);

  for (const name of DOCUMENTED_CASES) {
    assert.match(transport, new RegExp(`\\.${name}\\b`));
  }

  assert.equal(
    /\.seeking(?!Forward|Backward)/.test(code),
    false,
    'PlaybackStatus has no .seeking member; Xcode 26.2 rejects it',
  );
  assert.equal(code.includes('com.apple.developer.musickit'), false);
});

test('the watchdog keeps a scrub in progress and only restarts a stop', () => {
  const code = stripSwiftComments(fs.readFileSync(swiftPath, 'utf8'));
  const watch = functionBody(code, 'startWatch');

  assert.match(watch, /transportInProgress\(status\)/);
  const inProgress = watch.indexOf('transportInProgress(status)');
  const userPause = watch.indexOf('self.userPaused');
  const stopped = watch.indexOf('status == .stopped');
  const restart = watch.indexOf('ApplicationMusicPlayer.shared.play()');
  assert.ok(inProgress >= 0 && userPause > inProgress && stopped > userPause && restart > stopped);

  const pause = functionBody(code, 'pause');
  assert.match(pause, /userPaused = true/);
  assert.match(pause, /ApplicationMusicPlayer\.shared\.pause\(\)/);
  assert.equal(/\.play\(\)/.test(pause), false);
});
