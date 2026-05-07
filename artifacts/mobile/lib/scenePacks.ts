import type { ImageSourcePropType } from 'react-native';

export type SceneId = 'rainbowRoad' | 'flamingoCasino' | 'waterfallCavern';
export type SceneVariant = 'portrait' | 'landscape';
export type SceneLayerId = 'L0_far' | 'L1_mid' | 'L2_table' | 'L3_fx' | 'L4_vignette';

export interface SceneMeta {
  id: SceneId;
  name: string;
  description: string;
}

export const SCENES_META: SceneMeta[] = [
  { id: 'rainbowRoad', name: 'Rainbow Road', description: 'Iridescent highway through starfields and neon arcs' },
  { id: 'flamingoCasino', name: 'Flamingo Floor', description: 'Warm pink neon casino vibes (Vegas-inspired)' },
  { id: 'waterfallCavern', name: 'Waterfall Grotto', description: 'Serene cavern pool with mist and sun rays' },
];

export interface ScenePack {
  /** Optional bundled image layers. Null means “procedural-only” for that layer. */
  layers: Partial<Record<SceneVariant, Partial<Record<SceneLayerId, ImageSourcePropType | null>>>>;
  /** Parallax coefficients per layer (bigger = closer/faster). */
  parallax: Partial<Record<SceneLayerId, number>>;
}

export const SCENE_PACKS: Record<SceneId, ScenePack> = {
  rainbowRoad: {
    layers: {
      portrait: {
        L0_far: require('../assets/scenes/rainbowRoad/portrait/L0_far.png'),
        L1_mid: require('../assets/scenes/rainbowRoad/portrait/L1_mid.png'),
        L2_table: require('../assets/scenes/rainbowRoad/portrait/L2_table.png'),
        L3_fx: require('../assets/scenes/rainbowRoad/portrait/L3_fx.png'),
      },
      landscape: {
        L0_far: require('../assets/scenes/rainbowRoad/landscape/L0_far.png'),
        L1_mid: require('../assets/scenes/rainbowRoad/landscape/L1_mid.png'),
        L2_table: require('../assets/scenes/rainbowRoad/landscape/L2_table.png'),
        L3_fx: require('../assets/scenes/rainbowRoad/landscape/L3_fx.png'),
      },
    },
    parallax: { L0_far: 0.04, L1_mid: 0.12, L2_table: 0.06, L3_fx: 0.22, L4_vignette: 0.0 },
  },
  flamingoCasino: {
    layers: {
      portrait: {
        L0_far: require('../assets/scenes/flamingoCasino/portrait/L0_far.png'),
        L1_mid: require('../assets/scenes/flamingoCasino/portrait/L1_mid.png'),
        L2_table: require('../assets/scenes/flamingoCasino/portrait/L2_table.png'),
        L3_fx: require('../assets/scenes/flamingoCasino/portrait/L3_fx.png'),
      },
      landscape: {
        L0_far: require('../assets/scenes/flamingoCasino/landscape/L0_far.png'),
        L1_mid: require('../assets/scenes/flamingoCasino/landscape/L1_mid.png'),
        L2_table: require('../assets/scenes/flamingoCasino/landscape/L2_table.png'),
        L3_fx: require('../assets/scenes/flamingoCasino/landscape/L3_fx.png'),
      },
    },
    parallax: { L0_far: 0.03, L1_mid: 0.1, L2_table: 0.05, L3_fx: 0.2, L4_vignette: 0.0 },
  },
  waterfallCavern: {
    layers: {
      portrait: {
        L0_far: require('../assets/scenes/waterfallCavern/portrait/L0_far.png'),
        L1_mid: require('../assets/scenes/waterfallCavern/portrait/L1_mid.png'),
        L2_table: require('../assets/scenes/waterfallCavern/portrait/L2_table.png'),
        L3_fx: require('../assets/scenes/waterfallCavern/portrait/L3_fx.png'),
      },
      landscape: {
        L0_far: require('../assets/scenes/waterfallCavern/landscape/L0_far.png'),
        L1_mid: require('../assets/scenes/waterfallCavern/landscape/L1_mid.png'),
        L2_table: require('../assets/scenes/waterfallCavern/landscape/L2_table.png'),
        L3_fx: require('../assets/scenes/waterfallCavern/landscape/L3_fx.png'),
      },
    },
    parallax: { L0_far: 0.02, L1_mid: 0.08, L2_table: 0.04, L3_fx: 0.18, L4_vignette: 0.0 },
  },
};

export function getScenePack(id: SceneId | undefined | null): ScenePack {
  return SCENE_PACKS[id as SceneId] ?? SCENE_PACKS.rainbowRoad;
}

