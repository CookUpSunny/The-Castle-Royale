import React, { useEffect } from 'react';
import { useGame } from '@/contexts/GameContext';
import { fetchAdState, reconcileAdLossCount } from '@/lib/adsApi';
import { readLocalLossCount, rememberServerLossCount } from '@/lib/adLossStorage';
import { initializeAds } from '@/lib/mobileAds';

/**
 * Keeps the server loss count in sync. Interstitials are shown only from the
 * match-result screen. Second Chance is a once-per-tournament bracket entry,
 * not a rematch, and has no UI until tournaments exist.
 */
export default function AdBreakHost() {
  const { playerId } = useGame();

  useEffect(() => {
    void initializeAds();
  }, []);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;
    void (async () => {
      const local = await readLocalLossCount();
      const state = await fetchAdState(playerId).catch(() => null);
      if (cancelled || !state) return;
      await rememberServerLossCount(Math.max(local, state.lossCount));
      if (local > state.lossCount) await reconcileAdLossCount(playerId, local).catch(() => null);
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  return null;
}
