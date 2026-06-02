import type { LayoutRect } from '@/components/CardPlayFlight';

const DEFAULT_EPS_PX = 1;

/** Avoid re-state when measureInWindow returns micro-jitter → fewer re-renders / fewer effect runs. */
export function layoutRectsCloseEnough(
  prev: LayoutRect | null | undefined,
  next: LayoutRect,
  eps: number = DEFAULT_EPS_PX,
): boolean {
  if (!prev || prev.width <= 0 || prev.height <= 0) return false;
  return (
    Math.abs(prev.x - next.x) <= eps &&
    Math.abs(prev.y - next.y) <= eps &&
    Math.abs(prev.width - next.width) <= eps &&
    Math.abs(prev.height - next.height) <= eps
  );
}
