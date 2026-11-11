import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { SceneId } from '@/lib/scenePacks';

import {
  CARD_SKINS,
  canEquipCardSkin,
  type CardSkin,
  type CardSkinId,
} from '@/lib/cardSkins';
import type { AvatarId } from '@/lib/avatarPortrait';
import { noteEquippedAvatar } from '@/lib/equippedAvatar';
import {
  arenaAfterHydration,
  avatarAfterHydration,
  cardAfterHydration,
  type ArenaId,
} from '@/lib/loadoutSelection';
import { warmGameVisualCache } from '@/lib/preloadGameAssets';

export type { CardSkin, CardSkinId };
export { CARD_SKINS };
export type { AvatarId } from '@/lib/avatarPortrait';
export type { ArenaId } from '@/lib/loadoutSelection';

/**
 * Cosmetics layer — purely visual customizations the player can swap in/out
 * without affecting gameplay. Persisted to AsyncStorage so the choice
 * survives app restarts.
 *
 * Procedural skins follow the 10-deck Card Style Visual Kit: the first 5
 * are free, and the other 5 stay subscription-gated. Eight image backs are
 * registered separately with unlocked preview so they can be rendered before
 * purchase ownership exists. Equipping a locked procedural skin still
 * requires an active subscription.
 */

/**
 * ─── ADDING A NEW CHARACTER AVATAR ───────────────────────────────────────────
 * 1. Drop the portrait PNG into  artifacts/mobile/assets/avatars/<id>.png
 * 2. Add the id to AVATAR_IDS in lib/avatarPortrait.ts and the api-server
 *    allow-list in artifacts/api-server/src/lib/avatarId.ts
 * 3. Add an entry to the AVATARS array  (id, name, quote, color, portrait require())
 *    Optional: a framed selection card at assets/avatars/frames/<id>.png → selectionFrame
 * That's it — the rest of the app picks it up automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface AvatarOption {
  id: AvatarId;
  name: string;
  quote: string;
  color: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  portrait: any;
  /**
   * Optional full selection-card art (title, scene and border baked in).
   * When set, the loadout picker shows this in place of the portrait.
   * Drop it into assets/avatars/frames/<id>.png (about 4:3).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selectionFrame?: any;
}

export const AVATARS: AvatarOption[] = [
  {
    id: 'eagles',
    name: 'The Kingpin',
    quote: 'We own this table.',
    color: '#3b82f6',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    portrait: require('../assets/avatars/eagles.png') as number,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    selectionFrame: require('../assets/avatars/frames/eagles.png') as number,
  },
  {
    id: 'frog',
    name: 'The Frog',
    quote: 'Gentlemen, place your bets.',
    color: '#22c55e',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    portrait: require('../assets/avatars/frog.png') as number,
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    selectionFrame: require('../assets/avatars/frames/frog.png') as number,
  },
  {
    id: 'troll',
    name: 'Big Bet',
    quote: 'Go big or go home!',
    color: '#a855f7',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    portrait: require('../assets/avatars/troll.png') as number,
  },
  {
    id: 'gigi',
    name: 'Gigi Gorgon',
    quote: 'Lucky you.',
    color: '#22c55e',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    portrait: require('../assets/avatars/gigi.png') as number,
  },
  {
    id: 'rockner',
    name: 'Rockner Burns',
    quote: 'Winning is like cheesecake. Yummy.',
    color: '#dc2626',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    portrait: require('../assets/avatars/rockner.png') as number,
  },
  {
    id: 'sunami',
    name: 'Sunami Walker',
    quote: 'Oh come on. Show me you can handle the game.',
    color: '#f43f5e',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    portrait: require('../assets/avatars/sunami.png') as number,
  },
];

export interface Arena {
  id: ArenaId;
  name: string;
  premium: boolean;
  description: string;
}

export const ARENAS: Arena[] = [
  {
    id: 'greenTable',
    name: 'Casino Green',
    premium: false,
    description: 'The classic casino table — rich felt green under warm spotlight glow. Clean, timeless, and all business. No distractions. Just cards.',
  },
  {
    id: 'classic',
    name: 'The Flamingo Floor',
    premium: false,
    description: 'Step into a dazzling neon casino where fortune favors the bold, surrounded by glowing pink lights and the thrill of high-stakes play. Flamingos dance beneath towering neon signs as players battle on a floor that pulses with pure Vegas energy.\n\nWARNING: Winning streaks may become addictive.',
  },
  {
    id: 'cosmic',
    name: 'Cosmic Sanctum',
    premium: true,
    description: 'Drift into the depths of the universe where galaxies spiral endlessly and ancient cosmic forces surround the arena. Suspended beside a collapsing black hole, players duel among glowing crystals, celestial energy, and the silence of deep space.\n\nEvery match feels written in the stars.',
  },
  {
    id: 'royal',
    name: 'Olympus Throne',
    premium: true,
    description: 'Ascend into a divine kingdom carved from marble and gold, where towering columns and heavenly statues overlook the battlefield from above the clouds. Golden sunlight pours across the arena as thunder echoes through the skies of the gods themselves.\n\nEnter the throne room of immortals.',
  },
  {
    id: 'lightning',
    name: 'An Oasis in the Cave',
    premium: false,
    description: 'Hidden deep within a mystical cavern, this tranquil sanctuary glows with flowing waterfalls, vibrant vegetation, and drifting cherry blossoms. Soft lantern light reflects across crystal-blue waters as players battle in a peaceful paradise untouched by the outside world.\n\nBeauty can be the deadliest arena of all.',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    premium: true,
    description: 'Enter the digital realm where cascading code rains down through a world built entirely of data. Green characters stream endlessly as glowing circuits pulse beneath the surface — reality itself is just a program, and the cards you hold may already be written.\n\nThere is no spoon. Only the next hand.',
  },
  {
    id: 'rainbowRoad',
    name: 'Rainbow Road',
    premium: true,
    description: 'Neon loop-de-loop starfield — trolls ride a glittering rainbow track through deep space. Sparkling trails, loop-the-loops, and cosmic glow surround the table as the road itself becomes the arena.\n\nHold on tight. The next hand is around the bend.',
  },
];

interface CosmeticsContextType {
  cardSkin: CardSkinId;
  arena: ArenaId;
  scene: SceneId;
  avatarId: AvatarId;
  /** True once AsyncStorage has been read (or the read failed). Defaults are not saved before this. */
  hydrated: boolean;
  /** Pass `isSubscribed` so premium skins can be equipped by active subscribers. */
  setCardSkin: (id: CardSkinId, isSubscribed?: boolean) => void;
  setArena: (id: ArenaId) => void;
  setAvatar: (id: AvatarId) => void;
  /** True if the given skin is free, or `isSubscribed` is true. */
  isSkinUnlocked: (id: CardSkinId, isSubscribed?: boolean) => boolean;
}

const CosmeticsContext = createContext<CosmeticsContextType | null>(null);

const STORAGE_CARD_KEY = 'cosmetics.cardSkin';
const STORAGE_ARENA_KEY = 'cosmetics.arena';
const STORAGE_AVATAR_KEY = 'cosmetics.avatar';

export function CosmeticsProvider({ children }: { children: React.ReactNode }) {
  const [cardSkin, setCardSkinState] = useState<CardSkinId>('royal-gold');
  const [arena, setArenaState] = useState<ArenaId>('greenTable');
  const [avatarId, setAvatarState] = useState<AvatarId>('eagles');
  const [hydrated, setHydrated] = useState(false);
  // Set when the player confirms a choice before storage has loaded, so the
  // late read cannot put the previous character back.
  const avatarDirtyRef = useRef(false);
  const arenaDirtyRef = useRef(false);
  const cardDirtyRef = useRef(false);

  // Derive the scene from the arena so the background imagery matches the
  // arena the player selected. Each arena now has its own scene.
  const scene: SceneId =
    arena === 'rainbowRoad' ? 'rainbowRoad'     :
    arena === 'lightning'   ? 'waterfallCavern' :
    arena === 'royal'       ? 'olympusThrone'   :
    arena === 'cosmic'      ? 'cosmicSanctum'   :
    arena === 'classic'     ? 'flamingoFloor'   :
    arena === 'matrix'      ? 'matrixArena'     :
    'casinoGreen';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedCard, storedArena, storedAvatar] = await Promise.all([
          AsyncStorage.getItem(STORAGE_CARD_KEY),
          AsyncStorage.getItem(STORAGE_ARENA_KEY),
          AsyncStorage.getItem(STORAGE_AVATAR_KEY),
        ]);
        if (cancelled) return;
        setCardSkinState((current) => {
          const next = cardAfterHydration({
            dirty: cardDirtyRef.current,
            current,
            stored: storedCard,
          });
          if (next.migrate) AsyncStorage.setItem(STORAGE_CARD_KEY, next.skin).catch(() => {});
          return next.skin;
        });
        setArenaState((current) => {
          const next = arenaAfterHydration({ dirty: arenaDirtyRef.current, current, stored: storedArena });
          return next;
        });
        setAvatarState((current) => avatarAfterHydration({
          dirty: avatarDirtyRef.current,
          current,
          stored: storedAvatar,
        }));
      } catch {
        // Persistence is best-effort. Hydration still finishes so play can start.
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Keep the seat payload in sync with the equipped character, including the
  // value hydration just restored. setAvatar also updates this synchronously
  // so a confirm in the same turn does not emit the previous character.
  useEffect(() => {
    noteEquippedAvatar(avatarId);
  }, [avatarId]);

  // Decode hero backdrop/table PNGs, arena photo, and all avatar sprites ahead
  // of `/game` so the match doesn't hitch on first paint.
  useEffect(() => {
    void warmGameVisualCache(scene, arena);
  }, [scene, arena]);

  const setCardSkin = useCallback((id: CardSkinId, isSubscribed = false) => {
    if (!canEquipCardSkin(id, isSubscribed)) return; // Refuse to equip premium skins without an active subscription.
    cardDirtyRef.current = true;
    setCardSkinState(id);
    AsyncStorage.setItem(STORAGE_CARD_KEY, id).catch(() => {});
  }, []);

  const setArena = useCallback((id: ArenaId) => {
    arenaDirtyRef.current = true;
    setArenaState(id);
    AsyncStorage.setItem(STORAGE_ARENA_KEY, id).catch(() => {});
  }, []);

  const setAvatar = useCallback((id: AvatarId) => {
    avatarDirtyRef.current = true;
    noteEquippedAvatar(id);
    setAvatarState(id);
    AsyncStorage.setItem(STORAGE_AVATAR_KEY, id).catch(() => {});
  }, []);

  const isSkinUnlocked = useCallback(
    (id: CardSkinId, isSubscribed = false) => canEquipCardSkin(id, isSubscribed),
    [],
  );

  return (
    <CosmeticsContext.Provider value={{ cardSkin, arena, scene, avatarId, hydrated, setCardSkin, setArena, setAvatar, isSkinUnlocked }}>
      {children}
    </CosmeticsContext.Provider>
  );
}

export function useCosmetics(): CosmeticsContextType {
  const ctx = useContext(CosmeticsContext);
  if (!ctx) throw new Error('useCosmetics must be used inside <CosmeticsProvider>');
  return ctx;
}
