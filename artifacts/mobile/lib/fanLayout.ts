export const CARD_WIDTH = 66;
export const CARD_HEIGHT = 100;
/** Visible height of the fan container. Cards arc within this space. */
export const FAN_CONTAINER_H = 160;
/** Radius of the imaginary circle whose arc the card bottoms follow. */
const FAN_PIVOT_R = 190;
/** Maximum half-spread in degrees (each side from center). */
const MAX_HALF_SPREAD = 40;
/** Gap between the lowest painted card edge and the bottom of the fan box. */
const BASELINE_INSET = 8;

export interface FanPlacement {
  left: number;
  top: number;
  rotationDeg: number;
}

/**
 * Unshifted arc. The center card sits near the bottom of the box and edge
 * cards droop further down, so a bigger hand used to hang lower than a
 * smaller one.
 */
function rawFanPosition(index: number, total: number, containerWidth: number): FanPlacement {
  const center = (total - 1) / 2;
  const totalSpreadDeg = total <= 1 ? 0 : Math.min(total * 7, MAX_HALF_SPREAD * 2);
  const perCardDeg = total > 1 ? totalSpreadDeg / (total - 1) : 0;
  const rotationDeg = (index - center) * perCardDeg;
  const rotationRad = (rotationDeg * Math.PI) / 180;

  const pivotX = containerWidth / 2;
  const pivotY = FAN_CONTAINER_H + FAN_PIVOT_R - 10;

  const cardBottomX = pivotX + FAN_PIVOT_R * Math.sin(rotationRad);
  const cardBottomY = pivotY - FAN_PIVOT_R * Math.cos(rotationRad);

  return {
    left: cardBottomX - CARD_WIDTH / 2,
    top: cardBottomY - CARD_HEIGHT,
    rotationDeg,
  };
}

/** Extra pixels a rotated card hangs below its unrotated bottom edge. */
export function rotationDrop(rotationDeg: number): number {
  const rad = (Math.abs(rotationDeg) * Math.PI) / 180;
  const w2 = CARD_WIDTH / 2;
  const h2 = CARD_HEIGHT / 2;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  const maxY = Math.max(
    w2 * sin + h2 * cos,
    -w2 * sin + h2 * cos,
    w2 * sin - h2 * cos,
    -w2 * sin - h2 * cos,
  );
  return Math.max(0, maxY - h2);
}

export function cardVisualBottom(placement: FanPlacement): number {
  return placement.top + CARD_HEIGHT + rotationDrop(placement.rotationDeg);
}

/**
 * Fan placements whose lowest painted edge sits on one fixed baseline, so a
 * 1-card hand and a full hand occupy the same spot in front of the player.
 */
export function computeFanPositions(total: number, containerWidth: number): FanPlacement[] {
  if (total <= 0) return [];
  const raw = Array.from({ length: total }, (_, index) => rawFanPosition(index, total, containerWidth));
  const lowest = Math.max(...raw.map(cardVisualBottom));
  const shift = FAN_CONTAINER_H - BASELINE_INSET - lowest;
  return raw.map((placement) => ({ ...placement, top: placement.top + shift }));
}

export function computeFanPosition(index: number, total: number, containerWidth: number): FanPlacement {
  const placed = computeFanPositions(total, containerWidth);
  return placed[index] ?? rawFanPosition(index, total, containerWidth);
}

/** Fraction of each landscape card that stays on screen. The rest is below the edge. */
export const LANDSCAPE_VISIBLE_FRACTION = 0.75;

export function landscapeHandWindow(): number {
  return Math.round(CARD_HEIGHT * LANDSCAPE_VISIBLE_FRACTION);
}

/**
 * A wide, low fan for landscape. Cards share one row along the bottom.
 * Their lower quarter sits below the visible window so the table stays clear.
 */
export function computeLandscapeFanPositions(total: number, containerWidth: number): FanPlacement[] {
  if (total <= 0) return [];
  const margin = 16;
  const maxSpan = Math.max(0, containerWidth - CARD_WIDTH - margin * 2);
  const idealStep = 52;
  const step = total <= 1 ? 0 : Math.min(idealStep, maxSpan / (total - 1));
  const rowWidth = CARD_WIDTH + step * Math.max(0, total - 1);
  const origin = (containerWidth - rowWidth) / 2;
  const center = (total - 1) / 2;
  return Array.from({ length: total }, (_, index) => {
    const t = total <= 1 ? 0 : (index - center) / Math.max(center, 1);
    return {
      left: origin + index * step,
      top: 0,
      rotationDeg: t * 7,
    };
  });
}
