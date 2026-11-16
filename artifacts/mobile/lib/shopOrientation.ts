/**
 * Locks the Royal Shop can apply, and the lock to put back when the shop closes.
 * OTHER and UNKNOWN cannot be passed to lockAsync. An empty previous lock
 * restores DEFAULT, which is the app's free rotation. Gameplay never calls this.
 */
const RESTORABLE_LOCKS = new Set([
  'DEFAULT',
  'ALL',
  'PORTRAIT',
  'PORTRAIT_UP',
  'PORTRAIT_DOWN',
  'LANDSCAPE',
  'LANDSCAPE_LEFT',
  'LANDSCAPE_RIGHT',
]);

export function restoredShopOrientationLock(previous: string | null | undefined): string {
  if (!previous || !RESTORABLE_LOCKS.has(previous)) return 'DEFAULT';
  return previous;
}
