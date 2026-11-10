/** The corner figure sits behind the cards. Cards may cover it. */
export const CORNER_OPACITY = 0.62;

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

function playerSize(screenWidth: number, screenHeight: number): { width: number; height: number } {
  const width = Math.round(Math.min(280, Math.max(200, screenWidth * 0.62)));
  const height = Math.round(Math.min(screenHeight * 0.46, width * 1.28));
  return { width, height };
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
  const width = Math.round(Math.min(230, Math.max(160, screenWidth * 0.48)));
  const height = Math.round(Math.min(screenHeight * 0.34, width * 1.2));
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
  const height = Math.round(Math.min(screenHeight * 0.72, 280));
  const width = Math.round(Math.min(screenWidth * 0.34, height * 0.9));
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
  const height = Math.round(Math.min(screenHeight * 0.62, 240));
  const width = Math.round(Math.min(screenWidth * 0.28, height * 0.9));
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
