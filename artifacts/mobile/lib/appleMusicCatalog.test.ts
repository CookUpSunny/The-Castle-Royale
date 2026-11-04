import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ARENA_CATALOG,
  CATALOG_SONGS,
  CASTLE_ROYALE_OST_ALBUM,
  PLAYLIST_TRACK_INDEXES,
  SPLASH_CATALOG_ID,
  SUNNY_SYSTEMS_ARTIST,
  TRACK_CATALOG_IDS,
  UNRESOLVED_CATALOG_SONGS,
  catalogSelectionForArena,
  resolveCatalogPlayback,
} from './appleMusicCatalog';

const eligible = {
  platform: 'ios',
  preferenceOn: true,
  moduleAvailable: true,
  authorized: true,
  canPlayCatalog: true,
  muted: false,
};

test('every documented song is Sunny Systems on the Castle Royale soundtrack', () => {
  for (const song of Object.values(CATALOG_SONGS)) {
    assert.equal(song.artist, SUNNY_SYSTEMS_ARTIST);
    assert.equal(song.album, CASTLE_ROYALE_OST_ALBUM);
    assert.match(song.catalogId ?? '', /^[0-9]+$/);
  }
  assert.equal(UNRESOLVED_CATALOG_SONGS.length, 0);
});

test('arena and splash ids match the soundtrack album', () => {
  assert.equal(ARENA_CATALOG.greenTable, '6774232045');
  assert.equal(ARENA_CATALOG.lightning, '6774232044');
  assert.equal(ARENA_CATALOG.classic, '6774232041');
  assert.equal(ARENA_CATALOG.royal, '6774232048');
  assert.equal(ARENA_CATALOG.cosmic, '6774232047');
  assert.equal(ARENA_CATALOG.matrix, '6774232054');
  assert.equal(SPLASH_CATALOG_ID, '6774232049');
  assert.equal(CATALOG_SONGS.sparksFly.title, 'Sparks Fly');
  assert.equal(CATALOG_SONGS.whispersDippedInDye.title, 'Whispers Dipped In Dye');
});

test('rainbowRoad shuffles the four playlist songs and classic shares Go! Go! Go!', () => {
  const rainbow = catalogSelectionForArena('rainbowRoad');
  assert.equal(rainbow.loopOne, false);
  assert.deepEqual(rainbow.songIds, ['6774232045', '6774232049', '6774232051', '6774232041']);
  assert.deepEqual(
    PLAYLIST_TRACK_INDEXES.map((index) => TRACK_CATALOG_IDS[index]),
    rainbow.songIds,
  );
  assert.equal(TRACK_CATALOG_IDS[3], TRACK_CATALOG_IDS[5]);
  assert.equal(catalogSelectionForArena('classic').loopOne, true);
  assert.deepEqual(catalogSelectionForArena(undefined).songIds, rainbow.songIds);
});

test('catalog playback requires iOS, permission, a subscription, and an id', () => {
  const songs = catalogSelectionForArena('royal');
  assert.deepEqual(resolveCatalogPlayback({ ...eligible, songIds: songs.songIds }, true), {
    backend: 'musickit',
    songIds: ['6774232048'],
    loopOne: true,
  });

  for (const override of [
    { platform: 'android' },
    { preferenceOn: false },
    { moduleAvailable: false },
    { authorized: false },
    { canPlayCatalog: false },
    { muted: true },
  ]) {
    assert.equal(
      resolveCatalogPlayback({ ...eligible, ...override, songIds: songs.songIds }, true).backend,
      'bundled',
    );
  }

  assert.equal(resolveCatalogPlayback({ ...eligible, songIds: [null] }, true).backend, 'bundled');
});
