import type { ImageSourcePropType } from 'react-native';
import type { ArenaId } from '@/contexts/CosmeticsContext';

export type ArenaIdForTint = 'greenTable' | 'classic' | 'cosmic' | 'royal';

export { VISUAL_ASSET_PIPELINE } from './visualPipeline';

/** Shared neon casino table — graded per-arena via overlays in UI. */
export const TABLE_BACKDROP: ImageSourcePropType = require('../assets/casino/table_backdrop_neon.png');

/** Full-screen tint colors layered on top of `TABLE_BACKDROP` per arena. */
export const ARENA_TABLE_TINT: Record<
  ArenaIdForTint,
  readonly [string, string, string] | null
> = {
  greenTable: ['rgba(20,80,40,0.10)', 'rgba(0,30,10,0.06)', 'rgba(20,80,40,0.12)'],
  classic: ['rgba(88,28,135,0.14)', 'rgba(7,0,15,0.10)', 'rgba(88,28,135,0.18)'],
  cosmic: ['rgba(30,20,80,0.18)', 'rgba(120,80,255,0.08)', 'rgba(7,0,25,0.22)'],
  royal: ['rgba(120,53,15,0.18)', 'rgba(251,191,36,0.06)', 'rgba(60,20,10,0.24)'],
};

/**
 * Per-arena table felt tint palette used by the in-game felt overlay gradients.
 *
 * Each entry provides:
 *   `vertical`   — 6 rgba strings for the top→bottom LinearGradient
 *                  (transparent edges → soft tint peak in the middle third)
 *   `horizontal` — 3 rgba strings for the left→right LinearGradient
 *                  (transparent → soft oval centre → transparent)
 *
 * Arenas and their personality:
 *   classic   → The Flamingo Floor   → warm rose / pink
 *   cosmic    → Cosmic Sanctum       → deep purple / indigo  (matches legacy default)
 *   royal     → Olympus Throne       → warm amber / gold
 *   lightning → Oasis in the Cave    → cool teal / jade
 */
export const FELT_TINT: Record<
  ArenaId,
  { vertical: readonly [string, string, string, string, string, string]; horizontal: readonly [string, string, string] }
> = {
  greenTable: {
    vertical:   ['transparent', 'rgba(10,60,25,0.08)', 'rgba(20,100,45,0.22)', 'rgba(20,100,45,0.22)', 'rgba(10,60,25,0.08)', 'transparent'],
    horizontal: ['transparent', 'rgba(15,80,35,0.14)', 'transparent'],
  },
  classic: {
    vertical:   ['transparent', 'rgba(90,13,45,0.07)', 'rgba(140,26,78,0.16)', 'rgba(140,26,78,0.16)', 'rgba(90,13,45,0.07)', 'transparent'],
    horizontal: ['transparent', 'rgba(100,20,60,0.09)', 'transparent'],
  },
  cosmic: {
    vertical:   ['transparent', 'rgba(42,13,74,0.07)', 'rgba(91,26,140,0.16)', 'rgba(91,26,140,0.16)', 'rgba(42,13,74,0.07)', 'transparent'],
    horizontal: ['transparent', 'rgba(58,26,94,0.09)', 'transparent'],
  },
  royal: {
    vertical:   ['transparent', 'rgba(90,60,13,0.07)', 'rgba(140,100,26,0.16)', 'rgba(140,100,26,0.16)', 'rgba(90,60,13,0.07)', 'transparent'],
    horizontal: ['transparent', 'rgba(110,80,20,0.09)', 'transparent'],
  },
  lightning: {
    vertical:   ['transparent', 'rgba(13,74,60,0.07)', 'rgba(26,140,106,0.16)', 'rgba(26,140,106,0.16)', 'rgba(13,74,60,0.07)', 'transparent'],
    horizontal: ['transparent', 'rgba(20,100,80,0.09)', 'transparent'],
  },
};
