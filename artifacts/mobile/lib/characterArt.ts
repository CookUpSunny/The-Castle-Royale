/**
 * Selection art is the framed card. Match art is the transparent cutout
 * for the six new characters, and the full scene for the original six.
 * Empress, Maverick, Ronin, and Viper are not part of this roster.
 */
export const CHARACTER_ART = {
  'tau-ceti': { selection: 'select/tau-ceti.png', scene: 'scenes/tau-ceti.png', framedSelection: true },
  lioness: { selection: 'select/lioness.png', scene: 'scenes/lioness.png', framedSelection: true },
  bull: { selection: 'select/bull.png', scene: 'scenes/bull.png', framedSelection: true },
  oracle: { selection: 'select/oracle.png', scene: 'scenes/oracle.png', framedSelection: true },
  jackal: { selection: 'select/jackal.png', scene: 'scenes/jackal.png', framedSelection: true },
  fenix: { selection: 'select/fenix.png', scene: 'scenes/fenix.png', framedSelection: true },
  eagles: { selection: 'select/eagles.png', scene: 'scenes/eagles.png', framedSelection: false },
  frog: { selection: 'select/frog.png', scene: 'scenes/frog.png', framedSelection: false },
  troll: { selection: 'select/troll.png', scene: 'scenes/troll.png', framedSelection: false },
  gigi: { selection: 'scenes/gigi.png', scene: 'scenes/gigi.png', framedSelection: false },
  rockner: { selection: 'scenes/rockner.png', scene: 'scenes/rockner.png', framedSelection: false },
  sunami: { selection: 'scenes/sunami.png', scene: 'scenes/sunami.png', framedSelection: false },
} as const;

export type RosterId = keyof typeof CHARACTER_ART;

export const NEW_CHARACTER_IDS = ['tau-ceti', 'lioness', 'bull', 'oracle', 'jackal', 'fenix'] as const;
