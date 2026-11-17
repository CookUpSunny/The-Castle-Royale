import React, { createContext, useContext, useEffect } from 'react';
import {
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { EASE_IN_OUT } from '@/lib/motion';

const GlowClockContext = createContext<SharedValue<number> | null>(null);

/** One clock for every gold halo on the table. */
export function GlowClockProvider({ children }: { children: React.ReactNode }) {
  const clock = useSharedValue(0);

  useEffect(() => {
    clock.value = withRepeat(
      withTiming(1, { duration: 1200, easing: EASE_IN_OUT }),
      -1,
      true,
    );
    return () => cancelAnimation(clock);
  }, [clock]);

  return <GlowClockContext.Provider value={clock}>{children}</GlowClockContext.Provider>;
}

/** Falls back to a still value outside a match, so previews do not each start a clock. */
export function useGlowClock(): SharedValue<number> {
  const clock = useContext(GlowClockContext);
  const still = useSharedValue(0.5);
  return clock ?? still;
}
