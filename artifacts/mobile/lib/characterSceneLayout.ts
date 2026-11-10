import { CARD_WIDTH, computeFanPositions } from './fanLayout';

/** Reserved corner for the in-game cutout. The picture is contained inside it. */
export const PLAYER_SCENE_WIDTH = 132;
export const PLAYER_SCENE_HEIGHT = 168;
export const SCENE_OPACITY = 0.96;

export interface SceneFrame {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  height: number;
  opacity: number;
  fit: 'contain';
}

/** Lower-left corner of the portrait match. The plate stays on the left. */
export function portraitPlayerScene(safeLeft: number, safeBottom: number): SceneFrame {
  const width = PLAYER_SCENE_WIDTH;
  const height = PLAYER_SCENE_HEIGHT;
  return {
    left: safeLeft,
    bottom: safeBottom + 6,
    width,
    height,
    opacity: SCENE_OPACITY,
    fit: 'contain',
  };
}

/**
 * Shift the hand just far enough right that an 18-card fan clears the plate.
 * The fan stays on the bottom baseline; only its left origin moves.
 */
export function handLane(
  screenWidth: number,
  plateWidth: number,
  gap = 8,
  rightPad = 8,
): { origin: number; fanWidth: number; cardLeft: number; cardRight: number; maxHalfSpread: number } {
  const fanWidth = Math.max(180, screenWidth - plateWidth - gap - rightPad);
  const origin = plateWidth + gap;
  for (let half = 40; half >= 18; half -= 1) {
    const placed = computeFanPositions(18, fanWidth, half);
    const cardLeft = Math.min(...placed.map((card) => card.left)) + origin;
    const cardRight = Math.max(...placed.map((card) => card.left + CARD_WIDTH)) + origin;
    if (cardLeft >= plateWidth + gap - 0.5 && cardRight <= screenWidth - rightPad + 0.5) {
      return { origin, fanWidth, cardLeft, cardRight, maxHalfSpread: half };
    }
  }
  const placed = computeFanPositions(18, fanWidth, 18);
  return {
    origin,
    fanWidth,
    cardLeft: Math.min(...placed.map((card) => card.left)) + origin,
    cardRight: Math.max(...placed.map((card) => card.left + CARD_WIDTH)) + origin,
    maxHalfSpread: 18,
  };
}

/** Landscape plate sits in the left action column, beside the hand. */
export function landscapePlayerScene(
  safeLeft: number,
  safeBottom: number,
  columnWidth: number,
): SceneFrame {
  const width = Math.max(84, Math.min(columnWidth - 6, 120));
  const height = Math.min(150, Math.round(width * 1.2));
  return {
    left: safeLeft + 2,
    bottom: safeBottom + 4,
    width,
    height,
    opacity: SCENE_OPACITY,
    fit: 'contain',
  };
}

export function portraitOpponentScene(safeRight: number, safeTop: number): {
  right: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  fit: 'contain';
} {
  return {
    right: safeRight + 6,
    top: safeTop + 36,
    width: 104,
    height: 132,
    opacity: SCENE_OPACITY,
    fit: 'contain',
  };
}

export function landscapeStaysInColumn(
  frame: SceneFrame,
  safeLeft: number,
  columnWidth: number,
): boolean {
  return frame.left + frame.width <= safeLeft + columnWidth + 0.5;
}
