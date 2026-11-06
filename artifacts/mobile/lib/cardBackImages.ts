import type { ImageCardSkinId } from '@/lib/cardSkins';

/**
 * Full-front art for the eight image backs.
 *
 * Sources are the owner originals scaled down proportionally (long edge 1024,
 * Lanczos, no crop and no palette change) so the mobile bundle is not carrying
 * ~3MB files for cards that paint at roughly 40–110pt.
 */
export const CARD_BACK_IMAGES: Record<ImageCardSkinId, number> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  'atlas-red': require('../assets/cardbacks/atlas-red.png') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  'castle-cards': require('../assets/cardbacks/castle-cards.png') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  'queens-hand': require('../assets/cardbacks/queens-hand.png') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  'coat-of-arms': require('../assets/cardbacks/coat-of-arms.png') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  'big-winner': require('../assets/cardbacks/big-winner.png') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  'lady-luck': require('../assets/cardbacks/lady-luck.png') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  'gold-obsession': require('../assets/cardbacks/gold-obsession.png') as number,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  'royal-treasure-crest': require('../assets/cardbacks/royal-treasure-crest.png') as number,
};
