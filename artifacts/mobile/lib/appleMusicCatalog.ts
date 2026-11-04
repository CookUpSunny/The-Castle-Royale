import type { ArenaId } from '../contexts/CosmeticsContext';

/**
 * Apple Music catalog ids for arena music.
 *
 * Source: the public iTunes Search / Lookup API (no key), checked against
 * artist Sunny Systems (artistId 1765612011) and the album
 * "The Castle Royale (Original Game Soundtrack)" (collectionId 6774232040).
 * https://music.apple.com/us/album/the-castle-royale-original-game-soundtrack/6774232040
 *
 * `catalogId` is the Apple Music song id (the `i` query on music.apple.com,
 * the iTunes `trackId`). MusicKit plays that id from the catalog. The bundled
 * files in assets/music stay the fallback when an id is null, the player is
 * not authorized, or the Apple ID cannot play catalog content.
 *
 * Lookup used:
 *   https://itunes.apple.com/lookup?id=6774232040&entity=song&country=us
 * Titles below match `trackName` and `artistName` on that album.
 *
 * "Low Energy 2nd Wind" appears only as a stale comment on track1 in
 * MusicContext. It is not a Sunny Systems catalog song (an iTunes search for
 * that title plus the artist did not return one). track1 follows the file
 * header and this album: Sparks In These Eyes.
 *
 * rainbowRoad has no song of its own. It keeps shuffling the four playlist
 * files, and those four ids are all on the album.
 */

export const SUNNY_SYSTEMS_ARTIST = 'Sunny Systems';
export const SUNNY_SYSTEMS_ARTIST_ID = '1765612011';
export const CASTLE_ROYALE_OST_ALBUM = 'The Castle Royale (Original Game Soundtrack)';
export const CASTLE_ROYALE_OST_ALBUM_ID = '6774232040';

export interface CatalogSong {
  /** Null when no catalog song matched confidently. Playback uses the bundled file. */
  catalogId: string | null;
  title: string;
  artist: typeof SUNNY_SYSTEMS_ARTIST;
  album: typeof CASTLE_ROYALE_OST_ALBUM;
  albumId: typeof CASTLE_ROYALE_OST_ALBUM_ID;
  bundledFile: string;
  /** Where this recording is used. */
  role: string;
}

function song(catalogId: string, title: string, bundledFile: string, role: string): CatalogSong {
  return {
    catalogId,
    title,
    artist: SUNNY_SYSTEMS_ARTIST,
    album: CASTLE_ROYALE_OST_ALBUM,
    albumId: CASTLE_ROYALE_OST_ALBUM_ID,
    bundledFile,
    role,
  };
}

export const CATALOG_SONGS = {
  sparksInTheseEyes: song(
    '6774232045',
    'Sparks In These Eyes',
    'track1.m4a',
    'greenTable arena (Casino Green). Also playlist track 1.',
  ),
  sparksFly: song(
    '6774232049',
    'Sparks Fly',
    'track2.m4a',
    'Lobby / splash. Also playlist track 2.',
  ),
  wifeChangingMoney: song(
    '6774232051',
    'Wife Changing Money',
    'track3.m4a',
    'Playlist track 3.',
  ),
  goGoGo: song(
    '6774232041',
    'Go! Go! Go!',
    'track4.m4a',
    'classic arena (flamingo.m4a) and playlist track 4. Same catalog song for both files.',
  ),
  undergroundKingdom: song(
    '6774232044',
    'Underground Kingdom',
    'oasis.m4a',
    'lightning arena (An Oasis in the Cave).',
  ),
  winningManAnthem: song(
    '6774232048',
    'Winning Man Anthem',
    'olympus.m4a',
    'royal arena (Olympus Throne).',
  ),
  allIn: song(
    '6774232047',
    'All In',
    'cosmic.m4a',
    'cosmic arena (Cosmic Sanctum).',
  ),
  whispersDippedInDye: song(
    '6774232054',
    'Whispers Dipped In Dye',
    'matrix.m4a',
    'matrix arena. Catalog title capitalizes "In". The bundled comment says "Whispers Dipped in Dye".',
  ),
} as const;

/**
 * Songs that could not be matched. Empty: every bundled arena and playlist
 * title above was on the Sunny Systems soundtrack album.
 * Add `{ title, todo }` here instead of guessing an id.
 */
export const UNRESOLVED_CATALOG_SONGS: readonly { title: string; todo: string }[] = [];

/** Dedicated arena song. rainbowRoad is absent on purpose. */
export const ARENA_CATALOG: Record<Exclude<ArenaId, 'rainbowRoad'>, string | null> = {
  greenTable: CATALOG_SONGS.sparksInTheseEyes.catalogId,
  lightning: CATALOG_SONGS.undergroundKingdom.catalogId,
  classic: CATALOG_SONGS.goGoGo.catalogId,
  royal: CATALOG_SONGS.winningManAnthem.catalogId,
  cosmic: CATALOG_SONGS.allIn.catalogId,
  matrix: CATALOG_SONGS.whispersDippedInDye.catalogId,
};

export const SPLASH_CATALOG_ID: string | null = CATALOG_SONGS.sparksFly.catalogId;

/**
 * Parallel to MusicContext TRACKS indices.
 * 0 track1, 1 track2, 2 track3, 3 track4, 4 oasis, 5 flamingo, 6 olympus, 7 cosmic, 8 matrix.
 */
export const TRACK_CATALOG_IDS: readonly (string | null)[] = [
  CATALOG_SONGS.sparksInTheseEyes.catalogId,
  CATALOG_SONGS.sparksFly.catalogId,
  CATALOG_SONGS.wifeChangingMoney.catalogId,
  CATALOG_SONGS.goGoGo.catalogId,
  CATALOG_SONGS.undergroundKingdom.catalogId,
  CATALOG_SONGS.goGoGo.catalogId,
  CATALOG_SONGS.winningManAnthem.catalogId,
  CATALOG_SONGS.allIn.catalogId,
  CATALOG_SONGS.whispersDippedInDye.catalogId,
];

/** Generic playlist, TRACKS indices 0–3. rainbowRoad shuffles these. */
export const PLAYLIST_TRACK_INDEXES = [0, 1, 2, 3] as const;

export function catalogSelectionForArena(arenaId?: ArenaId): {
  loopOne: boolean;
  songIds: (string | null)[];
} {
  if (arenaId && Object.prototype.hasOwnProperty.call(ARENA_CATALOG, arenaId)) {
    const id = ARENA_CATALOG[arenaId as Exclude<ArenaId, 'rainbowRoad'>];
    return { loopOne: true, songIds: [id] };
  }
  return {
    loopOne: false,
    songIds: PLAYLIST_TRACK_INDEXES.map((index) => TRACK_CATALOG_IDS[index] ?? null),
  };
}

export interface CatalogDecisionInput {
  platform: string;
  preferenceOn: boolean;
  moduleAvailable: boolean;
  authorized: boolean;
  canPlayCatalog: boolean;
  muted: boolean;
  songIds: readonly (string | null)[];
}

export interface CatalogDecision {
  backend: 'musickit' | 'bundled';
  songIds: string[];
  loopOne: boolean;
}

/**
 * MusicKit only when every selected song has a numeric catalog id and the
 * device can actually stream it. Any gap falls back to the bundled player.
 * Mute stays on the bundled player so silence does not open a stream.
 */
export function resolveCatalogPlayback(input: CatalogDecisionInput, loopOne: boolean): CatalogDecision {
  const songIds: string[] = [];
  for (const id of input.songIds) {
    if (id == null || !/^[0-9]+$/.test(id)) {
      return { backend: 'bundled', songIds: [], loopOne };
    }
    songIds.push(id);
  }

  const eligible =
    input.platform === 'ios' &&
    input.preferenceOn &&
    input.moduleAvailable &&
    input.authorized &&
    input.canPlayCatalog &&
    !input.muted &&
    songIds.length > 0;

  if (!eligible) return { backend: 'bundled', songIds: [], loopOne };
  return { backend: 'musickit', songIds, loopOne };
}
