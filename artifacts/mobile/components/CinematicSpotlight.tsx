import type { LayoutRect } from '@/components/CardPlayFlight';

export type SpotlightStrength = 'off' | 'soft';

export default function CinematicSpotlight(_props: {
  targetRect: LayoutRect | null;
  strength: SpotlightStrength;
  trigger: number;
}) {
  return null;
}
