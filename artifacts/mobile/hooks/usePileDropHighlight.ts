import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { isOverPile } from '@/lib/pileHighlight';

/**
 * Lights the pile from the UI thread. `setState` runs only when the finger
 * crosses the drop radius, never on each drag frame.
 */
export function usePileDropHighlight(
  dragX: SharedValue<number>,
  dragY: SharedValue<number>,
  dragActive: SharedValue<number>,
  pileX: SharedValue<number>,
  pileY: SharedValue<number>,
  pileReady: SharedValue<number>,
  onHighlight: (highlighted: boolean) => void,
) {
  useAnimatedReaction(
    () => {
      if (dragActive.value === 0 || pileReady.value === 0) return false;
      return isOverPile(dragX.value, dragY.value, pileX.value, pileY.value);
    },
    (inside, wasInside) => {
      if (wasInside == null || inside === wasInside) return;
      scheduleOnRN(onHighlight, inside);
    },
  );
}
