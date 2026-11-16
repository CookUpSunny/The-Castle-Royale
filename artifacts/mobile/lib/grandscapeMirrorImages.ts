import type { ImageSourcePropType } from 'react-native';
import { grandscapePlayableFaceFile } from '@/lib/grandscapeMirrorPack';

/**
 * Bundled Grandscape Mirror art.
 *
 * Playable faces are the 52 files under assets/cardpacks/grandscape-mirror.
 * cardback.webp is the matching back while the pack is equipped.
 * The crowned ace is the shop thumbnail only. It is not a key in
 * GRANDSCAPE_FACE_SOURCES and grandscapeFaceSource never returns it.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const GRANDSCAPE_FACE_SOURCES: Readonly<Record<string, ImageSourcePropType>> = {
  'spades/A.webp': require('../assets/cardpacks/grandscape-mirror/spades/A.webp') as number,
  'spades/2.webp': require('../assets/cardpacks/grandscape-mirror/spades/2.webp') as number,
  'spades/3.webp': require('../assets/cardpacks/grandscape-mirror/spades/3.webp') as number,
  'spades/4.webp': require('../assets/cardpacks/grandscape-mirror/spades/4.webp') as number,
  'spades/5.webp': require('../assets/cardpacks/grandscape-mirror/spades/5.webp') as number,
  'spades/6.webp': require('../assets/cardpacks/grandscape-mirror/spades/6.webp') as number,
  'spades/7.webp': require('../assets/cardpacks/grandscape-mirror/spades/7.webp') as number,
  'spades/8.webp': require('../assets/cardpacks/grandscape-mirror/spades/8.webp') as number,
  'spades/9.webp': require('../assets/cardpacks/grandscape-mirror/spades/9.webp') as number,
  'spades/10.webp': require('../assets/cardpacks/grandscape-mirror/spades/10.webp') as number,
  'spades/J.webp': require('../assets/cardpacks/grandscape-mirror/spades/J.webp') as number,
  'spades/Q.webp': require('../assets/cardpacks/grandscape-mirror/spades/Q.webp') as number,
  'spades/K.webp': require('../assets/cardpacks/grandscape-mirror/spades/K.webp') as number,
  'hearts/A.webp': require('../assets/cardpacks/grandscape-mirror/hearts/A.webp') as number,
  'hearts/2.webp': require('../assets/cardpacks/grandscape-mirror/hearts/2.webp') as number,
  'hearts/3.webp': require('../assets/cardpacks/grandscape-mirror/hearts/3.webp') as number,
  'hearts/4.webp': require('../assets/cardpacks/grandscape-mirror/hearts/4.webp') as number,
  'hearts/5.webp': require('../assets/cardpacks/grandscape-mirror/hearts/5.webp') as number,
  'hearts/6.webp': require('../assets/cardpacks/grandscape-mirror/hearts/6.webp') as number,
  'hearts/7.webp': require('../assets/cardpacks/grandscape-mirror/hearts/7.webp') as number,
  'hearts/8.webp': require('../assets/cardpacks/grandscape-mirror/hearts/8.webp') as number,
  'hearts/9.webp': require('../assets/cardpacks/grandscape-mirror/hearts/9.webp') as number,
  'hearts/10.webp': require('../assets/cardpacks/grandscape-mirror/hearts/10.webp') as number,
  'hearts/J.webp': require('../assets/cardpacks/grandscape-mirror/hearts/J.webp') as number,
  'hearts/Q.webp': require('../assets/cardpacks/grandscape-mirror/hearts/Q.webp') as number,
  'hearts/K.webp': require('../assets/cardpacks/grandscape-mirror/hearts/K.webp') as number,
  'clubs/A.webp': require('../assets/cardpacks/grandscape-mirror/clubs/A.webp') as number,
  'clubs/2.webp': require('../assets/cardpacks/grandscape-mirror/clubs/2.webp') as number,
  'clubs/3.webp': require('../assets/cardpacks/grandscape-mirror/clubs/3.webp') as number,
  'clubs/4.webp': require('../assets/cardpacks/grandscape-mirror/clubs/4.webp') as number,
  'clubs/5.webp': require('../assets/cardpacks/grandscape-mirror/clubs/5.webp') as number,
  'clubs/6.webp': require('../assets/cardpacks/grandscape-mirror/clubs/6.webp') as number,
  'clubs/7.webp': require('../assets/cardpacks/grandscape-mirror/clubs/7.webp') as number,
  'clubs/8.webp': require('../assets/cardpacks/grandscape-mirror/clubs/8.webp') as number,
  'clubs/9.webp': require('../assets/cardpacks/grandscape-mirror/clubs/9.webp') as number,
  'clubs/10.webp': require('../assets/cardpacks/grandscape-mirror/clubs/10.webp') as number,
  'clubs/J.webp': require('../assets/cardpacks/grandscape-mirror/clubs/J.webp') as number,
  'clubs/Q.webp': require('../assets/cardpacks/grandscape-mirror/clubs/Q.webp') as number,
  'clubs/K.webp': require('../assets/cardpacks/grandscape-mirror/clubs/K.webp') as number,
  'diamonds/A.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/A.webp') as number,
  'diamonds/2.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/2.webp') as number,
  'diamonds/3.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/3.webp') as number,
  'diamonds/4.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/4.webp') as number,
  'diamonds/5.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/5.webp') as number,
  'diamonds/6.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/6.webp') as number,
  'diamonds/7.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/7.webp') as number,
  'diamonds/8.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/8.webp') as number,
  'diamonds/9.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/9.webp') as number,
  'diamonds/10.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/10.webp') as number,
  'diamonds/J.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/J.webp') as number,
  'diamonds/Q.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/Q.webp') as number,
  'diamonds/K.webp': require('../assets/cardpacks/grandscape-mirror/diamonds/K.webp') as number,
};

export const GRANDSCAPE_CARD_BACK_SOURCE: ImageSourcePropType =
  require('../assets/cardpacks/grandscape-mirror/cardback.webp') as number;

export const GRANDSCAPE_MARKETING_SOURCE: ImageSourcePropType =
  require('../assets/cardpacks/grandscape-mirror/marketing/ace_of_spades_crown.webp') as number;

export function grandscapeFaceSource(card: { suit: string; value: number }): ImageSourcePropType | null {
  const file = grandscapePlayableFaceFile(card);
  if (!file) return null;
  return GRANDSCAPE_FACE_SOURCES[file] ?? null;
}

export function grandscapeCardBackSource(): ImageSourcePropType | null {
  return GRANDSCAPE_CARD_BACK_SOURCE;
}

export function grandscapeMarketingSource(): ImageSourcePropType | null {
  return GRANDSCAPE_MARKETING_SOURCE;
}

/** Bundled module ids for expo-asset / Image.prefetch. Faces, back, and the shop thumbnail. */
export function grandscapeBundledImageModules(): number[] {
  const modules: number[] = [];
  for (const source of Object.values(GRANDSCAPE_FACE_SOURCES)) {
    if (typeof source === 'number') modules.push(source);
  }
  if (typeof GRANDSCAPE_CARD_BACK_SOURCE === 'number') modules.push(GRANDSCAPE_CARD_BACK_SOURCE);
  if (typeof GRANDSCAPE_MARKETING_SOURCE === 'number') modules.push(GRANDSCAPE_MARKETING_SOURCE);
  return modules;
}
