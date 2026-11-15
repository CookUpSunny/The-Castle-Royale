import type { ImageSourcePropType } from 'react-native';
import { grandscapePlayableFaceFile } from '@/lib/grandscapeMirrorPack';

/**
 * Bundled Grandscape Mirror art.
 *
 * Playable faces belong in assets/cardpacks/grandscape-mirror/{suit}/{rank}.webp
 * (52 files). cardback.webp is the matching back. The crowned ace is shop
 * thumbnail art only and must never be added to GRANDSCAPE_FACE_SOURCES.
 *
 * The WebP pack was not in the workspace, so these maps stay empty. Lookups
 * return null and the standard deck keeps drawing. Fill the maps with
 * require() of those files when the art is added; do not point a face at the
 * marketing file.
 */
export const GRANDSCAPE_FACE_SOURCES: Readonly<Partial<Record<string, ImageSourcePropType>>> = {};

export const GRANDSCAPE_CARD_BACK_SOURCE: ImageSourcePropType | null = null;

export const GRANDSCAPE_MARKETING_SOURCE: ImageSourcePropType | null = null;

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
