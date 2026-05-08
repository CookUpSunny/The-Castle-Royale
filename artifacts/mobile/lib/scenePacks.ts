import type { ImageSourcePropType } from 'react-native';

export type SceneId = 'flamingoCasino' | 'waterfallCavern' | 'olympusThrone' | 'cosmicSanctum' | 'flamingoFloor';
export type SceneVariant = 'portrait' | 'landscape';
export type SceneLayerId = 'L0_far' | 'L1_mid' | 'L2_table' | 'L3_fx' | 'L4_vignette';

export interface SceneMeta {
  id: SceneId;
  name: string;
  description: string;
}

export const SCENES_META: SceneMeta[] = [
  { id: 'flamingoCasino', name: 'Casino Green', description: 'Rich felt green under warm spotlight glow' },
  { id: 'waterfallCavern', name: 'Waterfall Grotto', description: 'Serene cavern pool with mist and sun rays' },
  { id: 'olympusThrone', name: 'Olympus Throne', description: 'Marble arena above the clouds, gods watching from above' },
];

export interface ScenePack {
  /** Optional bundled image layers. Null means “procedural-only” for that layer. */
  layers: Partial<Record<SceneVariant, Partial<Record<SceneLayerId, ImageSourcePropType | null>>>>;
  /** Parallax coefficients per layer (bigger = closer/faster). */
  parallax: Partial<Record<SceneLayerId, number>>;
}

export const SCENE_PACKS: Record<SceneId, ScenePack> = {
  flamingoCasino: {
    layers: {
      portrait: {
        L0_far:   require('../assets/scenes/flamingoCasino/portrait/L0_far.png'),
        L1_mid:   null,
        L2_table: require('../assets/scenes/flamingoCasino/portrait/L2_table.png'),
        L3_fx:    null,
      },
      landscape: {
        L0_far:   require('../assets/scenes/flamingoCasino/landscape/L0_far.png'),
        L1_mid:   null,
        L2_table: require('../assets/scenes/flamingoCasino/landscape/L2_table.png'),
        L3_fx:    null,
      },
    },
    parallax: { L0_far: 0.03, L1_mid: 0.1, L2_table: 0.05, L3_fx: 0.2, L4_vignette: 0.0 },
  },
  flamingoFloor: {
    layers: {
      portrait: {
        L0_far:   require('../assets/scenes/flamingoFloor/portrait/L0_far.png'),
        L1_mid:   null,
        L2_table: require('../assets/scenes/flamingoFloor/portrait/L2_table.png'),
        L3_fx:    null,
      },
      landscape: {
        L0_far:   require('../assets/scenes/flamingoFloor/landscape/L0_far.png'),
        L1_mid:   null,
        L2_table: require('../assets/scenes/flamingoFloor/landscape/L2_table.png'),
        L3_fx:    null,
      },
    },
    parallax: { L0_far: 0.03, L1_mid: 0.1, L2_table: 0.05, L3_fx: 0.2, L4_vignette: 0.0 },
  },
  cosmicSanctum: {
    layers: {
      portrait: {
        L0_far:   require('../assets/scenes/cosmicSanctum/portrait/L0_far.png'),
        L1_mid:   null,
        L2_table: require('../assets/scenes/cosmicSanctum/portrait/L2_table.png'),
        L3_fx:    null,
      },
      landscape: {
        L0_far:   require('../assets/scenes/cosmicSanctum/landscape/L0_far.png'),
        L1_mid:   null,
        L2_table: require('../assets/scenes/cosmicSanctum/landscape/L2_table.png'),
        L3_fx:    null,
      },
    },
    parallax: { L0_far: 0.02, L1_mid: 0.08, L2_table: 0.04, L3_fx: 0.18, L4_vignette: 0.0 },
  },
  olympusThrone: {
    layers: {
      portrait: {
        L0_far:   require('../assets/scenes/olympusThrone/portrait/L0_far.png'),
        L1_mid:   null,
        L2_table: require('../assets/scenes/olympusThrone/portrait/L2_table.png'),
        L3_fx:    null,
      },
      landscape: {
        L0_far:   require('../assets/scenes/olympusThrone/landscape/L0_far.png'),
        L1_mid:   null,
        L2_table: require('../assets/scenes/olympusThrone/landscape/L2_table.png'),
        L3_fx:    null,
      },
    },
    parallax: { L0_far: 0.02, L1_mid: 0.08, L2_table: 0.04, L3_fx: 0.18, L4_vignette: 0.0 },
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
  return SCENE_PACKS[id as SceneId] ?? SCENE_PACKS.flamingoCasino;
}

