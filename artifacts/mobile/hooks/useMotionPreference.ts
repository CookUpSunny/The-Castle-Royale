import { useReducedMotion } from 'react-native-reanimated';

/** True while the system Reduce Motion setting is on. Updates live. */
export function useMotionPreference(): boolean {
  return useReducedMotion();
}
