/**
 * iPhone Duo window classes.
 *
 * Folded outer screen is about 382×597. Unfolded is about 951×669 with a
 * vertical crease at the midpoint. A normal phone in landscape is wide but
 * short, so it stays on the existing single-column layout.
 */

export const DUO_BOOK_MIN_WIDTH = 800;
export const DUO_BOOK_MIN_HEIGHT = 560;
export const DUO_TALL_MIN_HEIGHT = 800;
export const DUO_TALL_MIN_WIDTH = 560;
export const DUO_CREASE_BAND = 72;

export type DuoMode = "compact" | "wide" | "tall";
export type DuoHinge = "none" | "vertical" | "horizontal";

export interface DuoLayout {
  mode: DuoMode;
  hinge: DuoHinge;
  creaseCenter: number;
  creaseBand: number;
  creaseStart: number;
  creaseEnd: number;
}

export function classifyDuoWindow(width: number, height: number): DuoLayout {
  const wide = width >= DUO_BOOK_MIN_WIDTH && height >= DUO_BOOK_MIN_HEIGHT;
  const tall =
    !wide && height >= DUO_TALL_MIN_HEIGHT && width >= DUO_TALL_MIN_WIDTH && width < DUO_BOOK_MIN_WIDTH;
  const mode: DuoMode = wide ? "wide" : tall ? "tall" : "compact";
  const hinge: DuoHinge = mode === "wide" ? "vertical" : mode === "tall" ? "horizontal" : "none";
  const center = hinge === "vertical" ? width / 2 : hinge === "horizontal" ? height / 2 : 0;
  const creaseBand = hinge === "none" ? 0 : DUO_CREASE_BAND;
  return {
    mode,
    hinge,
    creaseCenter: center,
    creaseBand,
    creaseStart: hinge === "none" ? 0 : center - creaseBand / 2,
    creaseEnd: hinge === "none" ? 0 : center + creaseBand / 2,
  };
}

/** Small web edge pad. Device chrome comes from safe-area insets. */
export function topContentInset(safeTop: number, os: string): number {
  return safeTop + (os === "web" ? 8 : 0);
}
