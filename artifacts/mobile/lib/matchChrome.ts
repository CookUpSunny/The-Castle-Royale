import { FAN_CONTAINER_H } from './fanLayout';

/** How far the hand sits above the safe-area padding. The fan shape is unchanged. */
export const HAND_RAISE = 36;

export const EMOTE_BUTTON = 34;
export const EMOTE_GAP = 8;

export interface HandFrame {
  width: number;
  bottom: number;
  centerX: number;
}

/** Safe-area hand box. The fan stays centered in this width and is lifted off the home indicator. */
export function handFrame(
  screenWidth: number,
  safeLeft: number,
  safeRight: number,
  safeBottom: number,
): HandFrame {
  const width = Math.max(240, Math.round(screenWidth - safeLeft - safeRight));
  return {
    width,
    bottom: Math.max(safeBottom, 12) + HAND_RAISE,
    centerX: safeLeft + width / 2,
  };
}

export interface EmoteDock {
  right: number;
  bottom: number;
  button: number;
  gap: number;
  chatBottom: number;
  emojiBottom: number;
}

/** Chat sits directly above the emoji button, in one column. */
export function emoteDock(safeRight: number, safeBottom: number): EmoteDock {
  const bottom = Math.max(safeBottom, 12);
  return {
    right: Math.max(safeRight, 12),
    bottom,
    button: EMOTE_BUTTON,
    gap: EMOTE_GAP,
    emojiBottom: bottom,
    chatBottom: bottom + EMOTE_BUTTON + EMOTE_GAP,
  };
}

export interface FinalThreeFrame {
  top: number;
  centerX: number;
  width: number;
  align: 'center';
}

/**
 * Final 3 title in the upper-middle, with the card row centered on the same axis beneath it.
 */
export function finalThreeFrame(
  screenWidth: number,
  screenHeight: number,
  safeTop: number,
): FinalThreeFrame {
  const preferred = Math.round(screenHeight * 0.30);
  const top = Math.min(
    Math.round(screenHeight * 0.40),
    Math.max(preferred, safeTop + 56),
  );
  return {
    top,
    centerX: screenWidth / 2,
    width: screenWidth,
    align: 'center',
  };
}

/** The menu button stays just above the raised fan. */
export function menuClearance(safeBottom: number): number {
  return Math.max(safeBottom, 12) + FAN_CONTAINER_H + HAND_RAISE + 10;
}
