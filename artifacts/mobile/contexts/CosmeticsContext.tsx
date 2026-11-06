import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { SceneId } from '@/lib/scenePacks';

import {
  CARD_SKINS,
  canEquipCardSkin,
  resolveStoredCardSkin,
  type CardSkin,
  type CardSkinId,
} from '@/lib/cardSkins';
import { warmGameVisualCache } from '@/lib/preloadGameAssets';

export type { CardSkin, CardSkinId };
export { CARD_SKINS };

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

export type ArenaId = 'greenTable' | 'classic' | 'cosmic' | 'royal' | 'lightning' | 'matrix' | 'rainbowRoad';

/**
 * ─── ADDING A NEW CHARACTER AVATAR ───────────────────────────────────────────
 * 1. Drop the portrait PNG into  artifacts/mobile/assets/avatars/<id>.png
 * 2. Add the new ID to the union below  (e.g.  | 'ninja')
 * 3. Add an entry to the AVATARS array  (id, name, quote, color, portrait require())
 * That's it — the rest of the app picks it up automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export type AvatarId = 'eagles' | 'frog' | 'troll' | 'gigi' | 'rockner' | 'sunami';

export interface AvatarOption {
  id: AvatarId;
  name: string;
  quote: string;
  color: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  portrait: any;
}

export const AVATARS: AvatarOption[] = [
  {
    id: 'eagles',
    name: 'The Eagles',
    quote: 'We own this table.',
    color: '#3b82f6',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    portrait: require('../assets/avatars/eagles.png') as number,
  },
  {
    id: 'frog',
    name: 'Gentleman Frog',
    quote: 'Gentlemen, place your bets.',
    color: '#22c55e',
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    portrait: require('../assets/avatars/frog.png') as number,
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

const isArenaId = (v: string | null): v is ArenaId =>
  v === 'greenTable' || v === 'classic' || v === 'cosmic' || v === 'royal' || v === 'lightning' || v === 'matrix' || v === 'rainbowRoad';

const AVATAR_ID_SET = new Set<string>(AVATARS.map((a) => a.id));
const isAvatarId = (v: string | null): v is AvatarId =>
  v !== null && AVATAR_ID_SET.has(v);

export function CosmeticsProvider({ children }: { children: React.ReactNode }) {
  const [cardSkin, setCardSkinState] = useState<CardSkinId>('royal-gold');
  const [arena, setArenaState] = useState<ArenaId>('greenTable');
  const [avatarId, setAvatarState] = useState<AvatarId>('eagles');

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
    (async () => {
      try {
        const [storedCard, storedArena, storedAvatar] = await Promise.all([
          AsyncStorage.getItem(STORAGE_CARD_KEY),
          AsyncStorage.getItem(STORAGE_ARENA_KEY),
          AsyncStorage.getItem(STORAGE_AVATAR_KEY),
        ]);
        if (storedCard) {
          // Migrate legacy IDs (classic/cosmic/royal) → new IDs.
          // Locked and unknown ids stay on the default and are not written back.
          const resolved = resolveStoredCardSkin(storedCard);
          if (resolved.migrate) {
            setCardSkinState(resolved.skin);
            AsyncStorage.setItem(STORAGE_CARD_KEY, resolved.skin).catch(() => {});
          } else if (resolved.skin !== 'royal-gold' || storedCard === 'royal-gold') {
            setCardSkinState(resolved.skin);
          }
        }
        if (isArenaId(storedArena)) setArenaState(storedArena);
        if (isAvatarId(storedAvatar)) setAvatarState(storedAvatar);
      } catch {
        // Persistence is best-effort.
      }
    })();
  }, []);

  // Decode hero backdrop/table PNGs, arena photo, and all avatar sprites ahead
  // of `/game` so the match doesn't hitch on first paint.
  useEffect(() => {
    void warmGameVisualCache(scene, arena);
  }, [scene, arena]);

  const setCardSkin = useCallback((id: CardSkinId, isSubscribed = false) => {
    if (!canEquipCardSkin(id, isSubscribed)) return; // Refuse to equip premium skins without an active subscription.
    setCardSkinState(id);
    AsyncStorage.setItem(STORAGE_CARD_KEY, id).catch(() => {});
  }, []);

  const setArena = useCallback((id: ArenaId) => {
    setArenaState(id);
    AsyncStorage.setItem(STORAGE_ARENA_KEY, id).catch(() => {});
  }, []);

  const setAvatar = useCallback((id: AvatarId) => {
    setAvatarState(id);
    AsyncStorage.setItem(STORAGE_AVATAR_KEY, id).catch(() => {});
  }, []);

  const isSkinUnlocked = useCallback(
    (id: CardSkinId, isSubscribed = false) => canEquipCardSkin(id, isSubscribed),
    [],
  );

  return (
    <CosmeticsContext.Provider value={{ cardSkin, arena, scene, avatarId, setCardSkin, setArena, setAvatar, isSkinUnlocked }}>
      {children}
    </CosmeticsContext.Provider>
  );
}

export function useCosmetics(): CosmeticsContextType {
  const ctx = useContext(CosmeticsContext);
  if (!ctx) throw new Error('useCosmetics must be used inside <CosmeticsProvider>');
  return ctx;
}
