import { FAN_CONTAINER_H } from './fanLayout';

/** PLAY ALL chips sit above the fan and move with it. */
const CHIP_BLOCK = 54;

export const EMOTE_BUTTON = 34;
export const EMOTE_GAP = 8;

/**
 * Visual lift of the hand above main's in-flow slot. About half of the
 * earlier 36pt raise. It is not added to the flex column, so the pile stays put.
 */
export const HAND_RAISE = 18;

/** In-flow height main reserves for the fan. Chips and Final 3 do not grow it. */
export const MAIN_HAND_SLOT = FAN_CONTAINER_H + 2;
/** Landscape hand margin on main, below the center column. */
export const LANDSCAPE_HAND_MARGIN = 14;

export interface HandFrame {
  width: number;
  bottom: number;
  centerX: number;
  /** Nudge inside the safe-area padding so the fan center is the screen center. */
  shift: number;
}

/** Fan box centered on the screen, a short step above main's slot. */
export function handFrame(
  screenWidth: number,
  safeLeft: number,
  safeRight: number,
  safeBottom: number,
): HandFrame {
  const width = Math.max(240, Math.round(screenWidth - safeLeft - safeRight));
  const screenCenter = screenWidth / 2;
  const safeCenter = safeLeft + width / 2;
  return {
    width,
    bottom: Math.max(safeBottom, 12) + HAND_RAISE,
    centerX: screenCenter,
    shift: screenCenter - safeCenter,
  };
}

export interface CenterFrame {
  handSlot: number;
  tableHeight: number;
  pileNudge: number;
  /** Pile group center, measured from the top of the table area. */
  pileCenterY: number;
}

/**
 * Portrait center area as on main aaf8024e. The 16pt nudge drops the pile
 * 8pt. The hand slot does not grow for an 18-card fan or the Final 3 stage.
 */
export function portraitCenterFrame(playColumnHeight: number): CenterFrame {
  const handSlot = MAIN_HAND_SLOT;
  const tableHeight = playColumnHeight - handSlot;
  const paddingTop = 6;
  const pileNudge = 16;
  const contentCenter = paddingTop + (tableHeight - paddingTop) / 2;
  return {
    handSlot,
    tableHeight,
    pileNudge,
    pileCenterY: contentCenter + pileNudge / 2,
  };
}

/** Landscape center column. The hand keeps main's 14pt margin in the flow. */
export function landscapeCenterFrame(columnHeight: number, opponentHeight: number): CenterFrame {
  const handSlot = MAIN_HAND_SLOT + LANDSCAPE_HAND_MARGIN;
  const tableHeight = columnHeight - opponentHeight - handSlot;
  return {
    handSlot,
    tableHeight,
    pileNudge: 16,
    pileCenterY: tableHeight / 2,
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

/** Chat sits directly above the emoji button, in one right-edge column. */
export function emoteDock(safeRight: number, safeBottom: number): EmoteDock {
  const bottom = Math.max(safeBottom, 12);
  const right = Math.max(safeRight, 12);
  return {
    right,
    bottom,
    button: EMOTE_BUTTON,
    gap: EMOTE_GAP,
    emojiBottom: bottom,
    chatBottom: bottom + EMOTE_BUTTON + EMOTE_GAP,
  };
}

/** Owner's red line: y≈712 on a 1024-tall screenshot, just under the pile count. */
export const FINAL_TITLE_FRACTION = 712 / 1024;

const FINAL_CARD_W = 66;
const FINAL_SLOT = 88;
const FINAL_GAP = 12;
/** Title, subtitle, and timer, then the card row. */
export const FINAL_LEAD = 78;
export const FINAL_CARD_H = 122;

export interface FinalThreeFrame {
  top: number;
  centerX: number;
  width: number;
  align: 'center';
  gap: number;
  cardTop: number;
  cardBottom: number;
  rowRight: number;
}

/**
 * Final 3 title on the red line. The three cards are centered beneath it
 * and stay left of the chat/emoji column.
 */
export function finalThreeFrame(
  screenWidth: number,
  screenHeight: number,
  safeTop: number,
  safeBottom: number,
  safeRight = 0,
): FinalThreeFrame {
  const block = FINAL_LEAD + FINAL_CARD_H;
  const preferred = Math.round(screenHeight * FINAL_TITLE_FRACTION);
  const maxTop = screenHeight - Math.max(safeBottom, 12) - block;
  const top = Math.max(safeTop + 8, Math.min(preferred, maxTop));
  const between = (FINAL_SLOT - FINAL_CARD_W) + FINAL_GAP;
  const rowWidth = FINAL_CARD_W * 3 + between * 2;
  const centerX = screenWidth / 2;
  return {
    top,
    centerX,
    width: screenWidth,
    align: 'center',
    gap: FINAL_GAP,
    cardTop: top + FINAL_LEAD,
    cardBottom: top + block,
    rowRight: centerX + rowWidth / 2,
  };
}

/** The menu button stays above the raised chips, on the player's side. */
export function menuClearance(safeBottom: number): number {
  return Math.max(safeBottom, 12) + HAND_RAISE + FAN_CONTAINER_H + CHIP_BLOCK + 8;
}
