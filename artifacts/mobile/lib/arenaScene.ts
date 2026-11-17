import type { ArenaId } from './loadoutSelection';
import type { SceneId } from './scenePacks';

/** The in-game scene for an arena. Jackpot stays on Casino Green's scene id. */
export function sceneIdForArena(arena: ArenaId): SceneId {
  switch (arena) {
    case 'rainbowRoad':
      return 'rainbowRoad';
    case 'lightning':
      return 'waterfallCavern';
    case 'royal':
      return 'olympusThrone';
    case 'cosmic':
      return 'cosmicSanctum';
    case 'classic':
      return 'flamingoFloor';
    case 'matrix':
      return 'matrixArena';
    default:
      return 'casinoGreen';
  }
}
