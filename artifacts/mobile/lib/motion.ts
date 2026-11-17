import { Easing } from 'react-native-reanimated';

/** Shared motion vocabulary. Numbers are the animate-expo curves, copied exactly. */
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
export const EASE_SHEET = Easing.bezier(0.32, 0.72, 0, 1);

/** No overshoot. */
export const SPRING_SETTLE = { duration: 400, dampingRatio: 1 } as const;
/** Snap back after a drag. Seed with the gesture velocity. */
export const SPRING_SNAP = { duration: 400, dampingRatio: 0.8 } as const;
export const SPRING_SHEET = { duration: 300, dampingRatio: 0.8 } as const;

export const DUR = { press: 120, small: 180, ui: 240, modal: 320 } as const;
