import { useEffect, useRef } from 'react';
import Purchases from 'react-native-purchases';
import { useGame } from '@/contexts/GameContext';
import { linkAdIdentity } from '@/lib/adsApi';

/**
 * Identifies the RevenueCat user as the Game Center id when we have one,
 * otherwise the anonymous player id. The webhook mirrors premium onto that id.
 */
export default function RevenueCatIdentity({ gameCenterId }: { gameCenterId: string | null }) {
  const { playerId } = useGame();
  const linked = useRef<string | null>(null);

  useEffect(() => {
    if (!playerId) return;
    const appUserId = gameCenterId || playerId;
    if (linked.current === appUserId) return;
    let cancelled = false;

    void (async () => {
      try {
        await Purchases.logIn(appUserId);
        if (cancelled) return;
        linked.current = appUserId;
        await linkAdIdentity({
          playerId,
          gameCenterId,
          revenueCatAppUserId: appUserId,
        });
      } catch (err) {
        console.warn('RevenueCat identity link failed:', err instanceof Error ? err.message : err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playerId, gameCenterId]);

  return null;
}
