import { Asset } from 'expo-asset';
import { Image } from 'react-native';
import { grandscapeBundledImageModules } from '@/lib/grandscapeMirrorImages';

let done = false;
let inflight: Promise<void> | null = null;

/**
 * Decode the Grandscape faces, back, and shop thumbnail into the image cache.
 * Call at app start and again when the pack is equipped. The first hand used
 * to wait on 52 webps and the faces popped in late.
 */
export function preloadGrandscapePackImages(): Promise<void> {
  if (done) return Promise.resolve();
  if (inflight) return inflight;
  inflight = loadGrandscapeImages()
    .then(() => {
      done = true;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function loadGrandscapeImages(): Promise<void> {
  const modules = grandscapeBundledImageModules();
  if (modules.length === 0) return;
  try {
    await Asset.loadAsync(modules);
  } catch {
    // The files are bundled. A failed cache warm must not block the match.
  }
  await Promise.all(
    modules.map(async (moduleId) => {
      try {
        const resolved = Image.resolveAssetSource(moduleId);
        if (resolved?.uri) await Image.prefetch(resolved.uri);
      } catch {
        // Prefetch is best-effort.
      }
    }),
  );
}
