/**
 * Visual asset pipeline for Castle Royale.
 *
 * v1 ships **bundled** curated table + portrait art (PNG in-repo). This keeps
 * gameplay offline-capable, predictable bundle size, and no API keys on
 * device. Optional CDN or server-side image generation can be layered later
 * without changing consumers of `sceneAssets` / cosmetics IDs.
 */
export const VISUAL_ASSET_PIPELINE = 'bundled' as const;
