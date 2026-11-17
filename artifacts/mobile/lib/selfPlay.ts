/** Own normal plays are a short flight. Opponents, resets, burns, and specials stay cinematic. */
export function selfPlayPresentation(input: {
  side: 'self' | 'opponent';
  type: string;
}): { flightMs: number; anticipationMs: number; spotlight: boolean; hand: boolean } {
  const trimmed = input.side === 'self' && input.type === 'normal';
  return {
    flightMs: trimmed ? 260 : 480,
    anticipationMs: trimmed ? 0 : 90,
    spotlight: !trimmed,
    hand: input.side === 'self' && input.type !== 'normal',
  };
}
