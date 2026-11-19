/**
 * Royal Shop doorway. The card opens, gold covers the screen, then the cover
 * falls to black. Durations here are the motion the player watches.
 * The black hold is not part of that budget: it stays up until the next
 * screen has laid out in the target orientation and its background is ready,
 * or until the safety cap. A short settle after the last size change hides
 * the tail of the rotation.
 *
 * Enter, full motion: card 350 + doors 300 + push 250 + toBlack 280 + reveal 480.
 * Reduced motion is an opacity crossfade through black, with no card travel.
 */

export const SHOP_DOORWAY_MS = {
  card: 350,
  doors: 300,
  push: 250,
  toBlack: 280,
  reveal: 480,
  orientationCap: 1800,
  /** Quiet window after the last matching size, so the rotation's last frame stays covered. */
  settle: 280,
  /** Exit only, when we cannot tell whether the phone will actually rotate. */
  exitQuiet: 520,
  exitFlood: 300,
  exitReveal: 420,
  reducedCover: 280,
  reducedReveal: 320,
} as const;

export const SHOP_DOORWAY_MOTION_BUDGET_MS = 1800;

export type DoorwayPhase =
  | 'idle'
  | 'enter'
  | 'covered'
  | 'reveal'
  | 'exit'
  | 'exit-covered'
  | 'exit-reveal';

export type DoorwayEvent =
  | 'enter'
  | 'covered'
  | 'settled'
  | 'reveal-done'
  | 'exit'
  | 'exit-covered';

export function entranceChoreographyMs(reducedMotion: boolean): number {
  if (reducedMotion) {
    return SHOP_DOORWAY_MS.reducedCover + SHOP_DOORWAY_MS.reducedReveal;
  }
  return (
    SHOP_DOORWAY_MS.card
    + SHOP_DOORWAY_MS.doors
    + SHOP_DOORWAY_MS.push
    + SHOP_DOORWAY_MS.toBlack
    + SHOP_DOORWAY_MS.reveal
  );
}

export function exitChoreographyMs(reducedMotion: boolean): number {
  if (reducedMotion) return SHOP_DOORWAY_MS.reducedCover + SHOP_DOORWAY_MS.reducedReveal;
  return SHOP_DOORWAY_MS.exitFlood + SHOP_DOORWAY_MS.toBlack + SHOP_DOORWAY_MS.exitReveal;
}

/** True when a portrait phone should play the doorway instead of navigating bare. */
export function shouldAnimateShopEntrance(width: number, height: number): boolean {
  return height > width && width > 0;
}

export function orientationMatches(
  width: number,
  height: number,
  target: 'landscape' | 'portrait',
): boolean {
  if (width <= 0 || height <= 0 || width === height) return false;
  return target === 'landscape' ? width > height : height > width;
}

/**
 * Cover the way out only when the interface is likely to rotate.
 * `entryWasPortrait` is the window at the moment Shop was tapped.
 * null means the shop was opened without a snapshot (deep link).
 */
export function exitShouldCover(
  entryWasPortrait: boolean | null,
  width: number,
  height: number,
): boolean {
  const uiPortrait = height > width && width > 0;
  if (entryWasPortrait === false) return false;
  if (entryWasPortrait === true) return !uiPortrait;
  return !uiPortrait;
}

/** The orientation we expect after the shop lock is released. */
export function exitOrientationTarget(width: number, height: number): 'landscape' | 'portrait' {
  return height > width ? 'landscape' : 'portrait';
}

export function doorwayHapticOnOpen(reducedMotion: boolean): boolean {
  return !reducedMotion;
}

/**
 * Ignore a second tap. Enter and exit only start from idle.
 * `settled` is the orientation (or the timeout). It is ignored until the
 * screen is fully covered, so a fast rotation cannot reveal early.
 */
export function stepDoorway(phase: DoorwayPhase, event: DoorwayEvent): DoorwayPhase {
  switch (phase) {
    case 'idle':
      if (event === 'enter') return 'enter';
      if (event === 'exit') return 'exit';
      return phase;
    case 'enter':
      if (event === 'covered') return 'covered';
      return phase;
    case 'covered':
      if (event === 'settled') return 'reveal';
      return phase;
    case 'reveal':
      if (event === 'reveal-done') return 'idle';
      return phase;
    case 'exit':
      if (event === 'exit-covered') return 'exit-covered';
      return phase;
    case 'exit-covered':
      if (event === 'settled') return 'exit-reveal';
      return phase;
    case 'exit-reveal':
      if (event === 'reveal-done') return 'idle';
      return phase;
    default:
      return phase;
  }
}

export function canEnterShop(phase: DoorwayPhase): boolean {
  return phase === 'idle';
}

export function canLeaveShop(phase: DoorwayPhase): boolean {
  return phase === 'idle';
}

export type OrientationWait = 'matched' | 'timeout' | 'quiet';

export interface OrientationWaitDeps {
  getSize: () => { width: number; height: number };
  subscribeDimensions: (onSize: (width: number, height: number) => void) => () => void;
  subscribeOrientation: (onLandscape: (landscape: boolean | null) => void) => () => void;
}

/**
 * Resolves when the window matches `target`, or when `capMs` elapses.
 * `quietMs` resolves early if nothing rotates — used on the way out when
 * the phone may already be in the orientation we are restoring.
 */
export function waitForOrientation(
  target: 'landscape' | 'portrait',
  capMs: number,
  deps: OrientationWaitDeps,
  quietMs?: number,
): Promise<OrientationWait> {
  const size = deps.getSize();
  if (orientationMatches(size.width, size.height, target)) return Promise.resolve('matched');

  return new Promise((resolve) => {
    let settled = false;
    let sawChange = false;
    let unsubDim = () => {};
    let unsubOri = () => {};
    let quietTimer: ReturnType<typeof setTimeout> | null = null;
    let capTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = (reason: OrientationWait) => {
      if (settled) return;
      settled = true;
      if (capTimer) clearTimeout(capTimer);
      if (quietTimer) clearTimeout(quietTimer);
      unsubDim();
      unsubOri();
      resolve(reason);
    };
    const noteChange = () => {
      sawChange = true;
      if (quietTimer) {
        clearTimeout(quietTimer);
        quietTimer = null;
      }
    };
    unsubDim = deps.subscribeDimensions((width, height) => {
      noteChange();
      if (orientationMatches(width, height, target)) finish('matched');
    });
    unsubOri = deps.subscribeOrientation((landscape) => {
      noteChange();
      const now = deps.getSize();
      if (orientationMatches(now.width, now.height, target)) finish('matched');
      if (landscape === null) return;
    });
    capTimer = setTimeout(() => finish('timeout'), capMs);
    if (quietMs !== undefined && quietMs >= 0) {
      quietTimer = setTimeout(() => {
        if (!sawChange) finish('quiet');
      }, quietMs);
    }
  });
}

export interface PresentationDeps extends OrientationWaitDeps {
  isSceneReady: () => boolean;
  /** Fires when the scene-ready flag changes. A ready scene does not count as a rotation. */
  subscribeSceneReady: (onReady: () => void) => () => void;
}

/**
 * Resolves when the window matches `target`, the destination scene has reported
 * ready, and the size has stayed still for `settleMs`. `quietMs` still resolves
 * early when nothing rotates, so web and an already-settled phone can move on.
 * The cap always wins.
 */
export function waitForPresentation(
  target: 'landscape' | 'portrait',
  capMs: number,
  deps: PresentationDeps,
  options?: { quietMs?: number; settleMs?: number },
): Promise<OrientationWait> {
  const settleMs = Math.max(0, options?.settleMs ?? 0);
  const quietMs = options?.quietMs;

  return new Promise((resolve) => {
    let settled = false;
    let sawChange = false;
    let unsubDim = () => {};
    let unsubOri = () => {};
    let unsubReady = () => {};
    let quietTimer: ReturnType<typeof setTimeout> | null = null;
    let capTimer: ReturnType<typeof setTimeout> | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = (reason: OrientationWait) => {
      if (settled) return;
      settled = true;
      if (capTimer) clearTimeout(capTimer);
      if (quietTimer) clearTimeout(quietTimer);
      if (settleTimer) clearTimeout(settleTimer);
      unsubDim();
      unsubOri();
      unsubReady();
      resolve(reason);
    };
    const clearSettle = () => {
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    };
    const consider = () => {
      if (settled) return;
      const now = deps.getSize();
      if (!orientationMatches(now.width, now.height, target) || !deps.isSceneReady()) {
        clearSettle();
        return;
      }
      const fire = () => {
        const size = deps.getSize();
        if (orientationMatches(size.width, size.height, target) && deps.isSceneReady()) finish('matched');
      };
      if (settleMs === 0) {
        fire();
        return;
      }
      clearSettle();
      settleTimer = setTimeout(fire, settleMs);
    };
    const noteChange = () => {
      sawChange = true;
      if (quietTimer) {
        clearTimeout(quietTimer);
        quietTimer = null;
      }
    };
    unsubDim = deps.subscribeDimensions(() => {
      noteChange();
      consider();
    });
    unsubOri = deps.subscribeOrientation(() => {
      noteChange();
      consider();
    });
    unsubReady = deps.subscribeSceneReady(() => {
      consider();
    });
    capTimer = setTimeout(() => finish('timeout'), capMs);
    if (quietMs !== undefined && quietMs >= 0) {
      quietTimer = setTimeout(() => {
        if (!sawChange) finish('quiet');
      }, quietMs);
    }
    consider();
  });
}
