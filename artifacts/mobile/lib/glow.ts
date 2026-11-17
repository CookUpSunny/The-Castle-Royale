/** Opacity of the pre-drawn gold halo. The clock is 0–1. */
export function haloOpacity(clock: number, active: boolean): number {
  'worklet';
  if (!active) return 0.12;
  return 0.35 + clock * 0.4;
}

/** Table-size backs stay still. Shop and loadout previews (md and up) may twinkle. */
export function cardBackStarsTwinkle(size: 'sm' | 'md' | 'lg'): boolean {
  return size !== 'sm';
}
