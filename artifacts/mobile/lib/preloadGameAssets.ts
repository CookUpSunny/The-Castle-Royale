import { Image } from 'expo-image';
import { TABLE_BACKDROP } from '@/lib/sceneAssets';
import { SCENE_PACKS, type SceneId } from '@/lib/scenePacks';

function collectSceneSources(sceneId: SceneId): number[] {
  const pack = SCENE_PACKS[sceneId];
  const ids = new Set<number>();
  for (const variant of ['portrait', 'landscape'] as const) {
    const layers = pack.layers[variant];
    if (!layers) continue;
    for (const src of Object.values(layers)) {
      if (typeof src === 'number') ids.add(src);
    }
  }
  return [...ids];
}

/**
 * Decodes bundled PNGs into the expo-image memory cache ahead of first paint.
 * Call whenever the equipped scene changes — typically once at startup plus
 * after the cosmetics picker writes a new scene id.
 *
 * Without this, the first frames after navigating into `/game` still decode
 * large backdrop/table PNGs on the UI thread, which reads as “slow loading”.
 */
export async function warmGameVisualCache(sceneId: SceneId): Promise<void> {
  const sources = new Set<number>();
  for (const id of collectSceneSources(sceneId)) sources.add(id);
  if (typeof TABLE_BACKDROP === 'number') sources.add(TABLE_BACKDROP);

  await Promise.all(
    [...sources].map((src) =>
      Image.loadAsync(src).catch(() => {
        // Prefetch is best-effort — never block UX if one decoder trips.
      }),
    ),
  );
}
