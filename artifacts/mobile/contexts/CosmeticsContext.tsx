import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { warmGameVisualCache } from '@/lib/preloadGameAssets';

/**
 * Cosmetics layer — purely visual customizations the player can swap in/out
 * without affecting gameplay. Persisted to AsyncStorage so the choice
 * survives app restarts.
 *
 * Card skins follow the 10-deck "Card Style Visual Kit" — the first 5 are
 * unlocked today; the remaining 5 carry a 🔒 COMING SOON badge and cannot
 * be equipped until the future paid tier ships.
 */

export type CardSkinId =
  | 'neon-glow'
  | 'royal-gold'
  | 'crystal-ice'
  | 'sakura-blossom'
  | 'inferno-flame'
  | 'midnight-void'
  | 'emerald-prestige'
  | 'pearl-white'
  | 'cyber-punk'
  | 'vintage-casino';

export type ArenaId = 'classic' | 'cosmic' | 'royal' | 'lightning';

export interface CardSkin {
  id: CardSkinId;
  name: string;
  /** True when the player can equip this skin today. Locked skins show a 🔒 badge. */
  unlocked: boolean;
  description: string;
}

export interface Arena {
  id: ArenaId;
  name: string;
  premium: boolean;
  description: string;
}

export const CARD_SKINS: CardSkin[] = [
  { id: 'neon-glow',       name: 'Neon Glow',        unlocked: true,  description: 'Futuristic neon lights with vibrant electric glow' },
  { id: 'royal-gold',      name: 'Royal Gold',       unlocked: true,  description: 'Luxurious gold detailing with a royal casino feel' },
  { id: 'crystal-ice',     name: 'Crystal Ice',      unlocked: true,  description: 'Icy crystal texture with cool blue tones' },
  { id: 'sakura-blossom',  name: 'Sakura Blossom',   unlocked: true,  description: 'Elegant cherry blossoms with soft pink accents' },
  { id: 'inferno-flame',   name: 'Inferno Flame',    unlocked: true,  description: 'Fiery molten edges with intense heat and power' },
  { id: 'midnight-void',   name: 'Midnight Void',    unlocked: false, description: 'Dark cosmic theme with mystical purple energy' },
  { id: 'emerald-prestige',name: 'Emerald Prestige', unlocked: false, description: 'Rich emerald green with gold premium accents' },
  { id: 'pearl-white',     name: 'Pearl White',      unlocked: false, description: 'Clean pearl white with elegant minimalism' },
  { id: 'cyber-punk',      name: 'Cyber Punk',       unlocked: false, description: 'High-tech cyber design with neon cyber accents' },
  { id: 'vintage-casino',  name: 'Vintage Casino',   unlocked: false, description: 'Classic vintage look with aged casino charm' },
];

export const ARENAS: Arena[] = [
  {
    id: 'classic',
    name: 'The Flamingo Floor',
    premium: false,
    description: 'Step into a dazzling neon casino where fortune favors the bold, surrounded by glowing pink lights, glossy marble floors, and the thrill of high-stakes play. Every corner pulses with luxury as players battle beneath towering flamingo statues and radiant casino energy.\n\nWARNING: Winning streaks may become addictive.',
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
    premium: true,
    description: 'Hidden deep within a mystical cavern, this tranquil sanctuary glows with flowing waterfalls, vibrant vegetation, and drifting cherry blossoms. Soft lantern light reflects across crystal-blue waters as players battle in a peaceful paradise untouched by the outside world.\n\nBeauty can be the deadliest arena of all.',
  },
];

const VALID_SKIN_IDS = new Set<CardSkinId>(CARD_SKINS.map((s) => s.id));
const UNLOCKED_SKIN_IDS = new Set<CardSkinId>(CARD_SKINS.filter((s) => s.unlocked).map((s) => s.id));

/** One-time migration of legacy stored skin IDs from the previous cosmetics revision. */
const LEGACY_SKIN_MAP: Record<string, CardSkinId> = {
  classic: 'neon-glow',
  cosmic: 'midnight-void',
  royal: 'royal-gold',
};

interface CosmeticsContextType {
  cardSkin: CardSkinId;
  arena: ArenaId;
  setCardSkin: (id: CardSkinId) => void;
  setArena: (id: ArenaId) => void;
  /** True if the given skin can be equipped today. */
  isSkinUnlocked: (id: CardSkinId) => boolean;
}

const CosmeticsContext = createContext<CosmeticsContextType | null>(null);

const STORAGE_CARD_KEY = 'cosmetics.cardSkin';
const STORAGE_ARENA_KEY = 'cosmetics.arena';

const isArenaId = (v: string | null): v is ArenaId =>
  v === 'classic' || v === 'cosmic' || v === 'royal' || v === 'lightning';

export function CosmeticsProvider({ children }: { children: React.ReactNode }) {
  const [cardSkin, setCardSkinState] = useState<CardSkinId>('neon-glow');
  const [arena, setArenaState] = useState<ArenaId>('classic');

  useEffect(() => {
    (async () => {
      try {
        const [storedCard, storedArena] = await Promise.all([
          AsyncStorage.getItem(STORAGE_CARD_KEY),
          AsyncStorage.getItem(STORAGE_ARENA_KEY),
        ]);
        if (storedCard) {
          // Migrate legacy IDs (classic/cosmic/royal) → new IDs.
          const migrated = LEGACY_SKIN_MAP[storedCard];
          if (migrated && UNLOCKED_SKIN_IDS.has(migrated)) {
            setCardSkinState(migrated);
            AsyncStorage.setItem(STORAGE_CARD_KEY, migrated).catch(() => {});
          } else if (VALID_SKIN_IDS.has(storedCard as CardSkinId) && UNLOCKED_SKIN_IDS.has(storedCard as CardSkinId)) {
            setCardSkinState(storedCard as CardSkinId);
          }
          // Otherwise stay on the default (e.g. user had a locked skin somehow).
        }
        if (isArenaId(storedArena)) setArenaState(storedArena);
      } catch {
        // Persistence is best-effort.
      }
    })();
  }, []);

  // Decode hero backdrop/table PNGs, arena photo, and all avatar sprites ahead
  // of `/game` so the match doesn't hitch on first paint.
  useEffect(() => {
    void warmGameVisualCache('rainbowRoad', arena);
  }, [arena]);

  const setCardSkin = useCallback((id: CardSkinId) => {
    if (!UNLOCKED_SKIN_IDS.has(id)) return; // Refuse to equip locked skins.
    setCardSkinState(id);
    AsyncStorage.setItem(STORAGE_CARD_KEY, id).catch(() => {});
  }, []);

  const setArena = useCallback((id: ArenaId) => {
    setArenaState(id);
    AsyncStorage.setItem(STORAGE_ARENA_KEY, id).catch(() => {});
  }, []);

  const isSkinUnlocked = useCallback((id: CardSkinId) => UNLOCKED_SKIN_IDS.has(id), []);

  return (
    <CosmeticsContext.Provider value={{ cardSkin, arena, setCardSkin, setArena, isSkinUnlocked }}>
      {children}
    </CosmeticsContext.Provider>
  );
}

export function useCosmetics(): CosmeticsContextType {
  const ctx = useContext(CosmeticsContext);
  if (!ctx) throw new Error('useCosmetics must be used inside <CosmeticsProvider>');
  return ctx;
}
