import { menuClearance } from './matchChrome';

/** The corner figure sits behind the cards. Cards may cover it. */
export const CORNER_OPACITY = 0.62;
/** Corner figures are 15% smaller than the first in-match cut. */
export const CORNER_SCALE = 0.85;
/** Square tap target for the name and sound menu. */
export const PLAYER_MENU_HIT = 44;

export interface CornerFigure {
  width: number;
  height: number;
  opacity: number;
  fit: 'contain';
  pointerEvents: 'none';
  left?: number;
  bottom?: number;
  top?: number;
  right?: number;
}

function shrink(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.round(width * CORNER_SCALE),
    height: Math.round(height * CORNER_SCALE),
  };
}

function playerSize(screenWidth: number, screenHeight: number): { width: number; height: number } {
  const width = Math.round(Math.min(280, Math.max(200, screenWidth * 0.62)));
  const height = Math.round(Math.min(screenHeight * 0.46, width * 1.28));
  return shrink(width, height);
}

/**
 * Lower-left player cutout. Negative left and bottom crop it on the screen
 * edges so it reads as emerging from the corner. It does not move the hand.
 */
export function portraitPlayerCorner(screenWidth: number, screenHeight: number): CornerFigure {
  const { width, height } = playerSize(screenWidth, screenHeight);
  return {
    left: -Math.round(width * 0.22),
    bottom: -Math.round(height * 0.16),
    width,
    height,
    opacity: CORNER_OPACITY,
    fit: 'contain',
    pointerEvents: 'none',
  };
}

/** Top-right opponent cutout, cropped by the top and right edges. */
export function portraitOpponentCorner(screenWidth: number, screenHeight: number): CornerFigure {
  const rawWidth = Math.round(Math.min(230, Math.max(160, screenWidth * 0.48)));
  const rawHeight = Math.round(Math.min(screenHeight * 0.34, rawWidth * 1.2));
  const { width, height } = shrink(rawWidth, rawHeight);
  return {
    top: -Math.round(height * 0.18),
    right: -Math.round(width * 0.2),
    width,
    height,
    opacity: CORNER_OPACITY,
    fit: 'contain',
    pointerEvents: 'none',
  };
}

export function landscapePlayerCorner(screenWidth: number, screenHeight: number): CornerFigure {
  const rawHeight = Math.round(Math.min(screenHeight * 0.72, 280));
  const rawWidth = Math.round(Math.min(screenWidth * 0.34, rawHeight * 0.9));
  const { width, height } = shrink(rawWidth, rawHeight);
  return {
    left: -Math.round(width * 0.2),
    bottom: -Math.round(height * 0.14),
    width,
    height,
    opacity: CORNER_OPACITY,
    fit: 'contain',
    pointerEvents: 'none',
  };
}

export function landscapeOpponentCorner(screenWidth: number, screenHeight: number): CornerFigure {
  const rawHeight = Math.round(Math.min(screenHeight * 0.62, 240));
  const rawWidth = Math.round(Math.min(screenWidth * 0.28, rawHeight * 0.9));
  const { width, height } = shrink(rawWidth, rawHeight);
  return {
    top: -Math.round(height * 0.16),
    right: -Math.round(width * 0.18),
    width,
    height,
    opacity: CORNER_OPACITY,
    fit: 'contain',
    pointerEvents: 'none',
  };
}

export interface MenuButtonFrame {
  left: number;
  bottom: number;
  width: number;
  height: number;
  /** The control opens the existing name and sound menu. */
  opens: 'playerMenu';
}

/**
 * Portrait control sits just above the fan, on the player's side, so it
 * does not cover the hand, the centered pile, or the action buttons.
 */
export function portraitMenuButton(safeLeft: number, safeBottom: number): MenuButtonFrame {
  return {
    left: safeLeft + 10,
    bottom: menuClearance(safeBottom),
    width: PLAYER_MENU_HIT,
    height: PLAYER_MENU_HIT,
    opens: 'playerMenu',
  };
}

/** Landscape control sits in the lower-left corner, beside the hand column. */
export function landscapeMenuButton(safeLeft: number, safeBottom: number): MenuButtonFrame {
  return {
    left: safeLeft + 10,
    bottom: safeBottom + 10,
    width: PLAYER_MENU_HIT,
    height: PLAYER_MENU_HIT,
    opens: 'playerMenu',
  };
}

export function togglePlayerMenu(open: boolean): boolean {
  return !open;
}
