/**
 * Existing roster only. Frog, Eagles, and Troll have a vertical selection
 * frame plus a full scene. Gigi, Rockner, and Sunami have the full scene only.
 * There is no bull character in this set.
 */
export const CHARACTER_ART = {
  eagles: { selection: 'select/eagles.png', scene: 'scenes/eagles.png', hasVerticalSelection: true },
  frog: { selection: 'select/frog.png', scene: 'scenes/frog.png', hasVerticalSelection: true },
  troll: { selection: 'select/troll.png', scene: 'scenes/troll.png', hasVerticalSelection: true },
  gigi: { selection: 'scenes/gigi.png', scene: 'scenes/gigi.png', hasVerticalSelection: false },
  rockner: { selection: 'scenes/rockner.png', scene: 'scenes/rockner.png', hasVerticalSelection: false },
  sunami: { selection: 'scenes/sunami.png', scene: 'scenes/sunami.png', hasVerticalSelection: false },
} as const;

export type RosterId = keyof typeof CHARACTER_ART;
