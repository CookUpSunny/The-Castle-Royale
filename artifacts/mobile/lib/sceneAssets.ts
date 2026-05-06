import type { ImageSourcePropType } from 'react-native';

export type ArenaIdForTint = 'classic' | 'cosmic' | 'royal';

export { VISUAL_ASSET_PIPELINE } from './visualPipeline';

/** Shared neon casino table — graded per-arena via overlays in UI. */
export const TABLE_BACKDROP: ImageSourcePropType = require('../assets/casino/table_backdrop_neon.png');

/** Full-screen tint colors layered on top of `TABLE_BACKDROP` per arena. */
export const ARENA_TABLE_TINT: Record<
  ArenaIdForTint,
  readonly [string, string, string] | null
> = {
  classic: ['rgba(88,28,135,0.14)', 'rgba(7,0,15,0.10)', 'rgba(88,28,135,0.18)'],
  cosmic: ['rgba(30,20,80,0.18)', 'rgba(120,80,255,0.08)', 'rgba(7,0,25,0.22)'],
  royal: ['rgba(120,53,15,0.18)', 'rgba(251,191,36,0.06)', 'rgba(60,20,10,0.24)'],
};
