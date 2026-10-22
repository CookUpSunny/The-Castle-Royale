import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGame } from '@/contexts/GameContext';
import { useGameCenter } from '@/contexts/GameCenterContext';
import {
  fetchAdState,
  fetchSecondChance,
  grantUnverifiedSecondChance,
  reconcileAdLossCount,
} from '@/lib/adsApi';
import { readLocalLossCount, readSettledLossCount, rememberServerLossCount, writeSettledLossCount } from '@/lib/adLossStorage';
import { usesGoogleTestAds } from '@/lib/adUnitIds';
import { initializeAds, showInterstitialAd, showRewardedAd } from '@/lib/mobileAds';
import { useSubscription } from '@/lib/revenuecat';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Shows Second Chance after a loss, then the every-3rd-loss interstitial
 * when the player skips the rewarded ad. Also catches a missed interstitial
 * on the next launch.
 */
export default function AdBreakHost() {
  const {
    playerId,
    pendingSettlement,
    noteSettlement,
    resolveAdBreak,
    clearSettlement,
    quickPlayBot,
    joinQueue,
    createRoom,
  } = useGame();
  const { profile } = useGameCenter();
  const { isSubscribed, isLoading: subscriptionLoading } = useSubscription();
  const [remainingSec, setRemainingSec] = useState(60);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void initializeAds();
  }, []);

  useEffect(() => {
    if (!playerId || subscriptionLoading) return;
    let cancelled = false;
    void (async () => {
      const local = await readLocalLossCount();
      const state = await fetchAdState(playerId).catch(() => null);
      if (cancelled || !state) return;
      const merged = await rememberServerLossCount(Math.max(local, state.lossCount));
      if (local > state.lossCount) await reconcileAdLossCount(playerId, local).catch(() => null);
      const settled = await readSettledLossCount();
      if (!state.isPremium && !isSubscribed && merged > settled && merged % 3 === 0) {
        await showInterstitialAd();
        await writeSettledLossCount(merged);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [playerId, isSubscribed, subscriptionLoading]);

  const offer = pendingSettlement?.secondChance;
  const open = !!pendingSettlement && (offer?.status === 'pending' || offer?.granted === true);

  useEffect(() => {
    if (!offer || offer.granted) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(offer.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSec(left);
      if (left <= 0) void resolveAdBreak();
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [offer, resolveAdBreak]);

  if (!open || !pendingSettlement || !offer) return null;

  const startRematch = () => {
    void writeSettledLossCount(pendingSettlement.lossCount);
    clearSettlement();
    if (pendingSettlement.mode === 'bot') {
      quickPlayBot();
      router.replace('/game-loading?mode=bot');
      return;
    }
    if (pendingSettlement.mode === 'private') {
      createRoom();
      router.replace('/private-room');
      return;
    }
    joinQueue();
    router.replace('/matchmaking');
  };

  const watchAd = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await showRewardedAd({
        userId: playerId,
        customData: `${offer.offerId}|${offer.nonce}`,
      });
      if (result !== 'earned') {
        setMessage(result === 'unavailable' ? 'Ad is not available in this build. You can skip.' : 'Ad closed before the reward.');
        return;
      }
      let granted = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        granted = await fetchSecondChance(offer.offerId, playerId);
        if (granted?.secondChance.granted) break;
        await delay(1000);
      }
      if (!granted?.secondChance.granted && usesGoogleTestAds()) {
        granted = await grantUnverifiedSecondChance(offer.offerId, playerId, offer.nonce);
      }
      if (!granted?.secondChance.granted) {
        setMessage('Reward is still confirming. If this keeps happening, the AdMob callback is not reaching the server.');
        return;
      }
      noteSettlement(granted);
      await writeSettledLossCount(granted.lossCount);
      clearSettlement();
      if (granted.mode === 'bot') {
        quickPlayBot();
        router.replace('/game-loading?mode=bot');
      } else if (granted.mode === 'private') {
        createRoom();
        router.replace('/private-room');
      } else {
        joinQueue();
        router.replace('/matchmaking');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.scrim} pointerEvents="box-none">
      <View style={styles.card}>
        <Text style={styles.kicker}>SECOND CHANCE</Text>
        <Text style={styles.title}>{offer.granted ? 'Rematch is ready' : 'Stay in the fight'}</Text>
        <Text style={styles.body}>
          {offer.granted || isSubscribed
            ? 'Premium includes one Second Chance after this loss, with no ad.'
            : `Watch one short ad to rematch. ${remainingSec}s left. Skipping still counts this loss.`}
        </Text>
        {profile?.displayName ? <Text style={styles.meta}>{profile.displayName}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {offer.granted || isSubscribed ? (
          <Pressable onPress={startRematch} style={styles.primary}>
            <Text style={styles.primaryText}>REMATCH</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => void watchAd()} disabled={busy} style={styles.primary}>
            {busy ? <ActivityIndicator color="#1a0e00" /> : <Text style={styles.primaryText}>WATCH AD</Text>}
          </Pressable>
        )}
        <Pressable onPress={() => void resolveAdBreak()} disabled={busy} style={styles.secondary}>
          <Text style={styles.secondaryText}>NO THANKS</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  card: {
    backgroundColor: '#14081f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: '#a855f7',
  },
  kicker: { color: '#f5e070', letterSpacing: 3, fontSize: 12, fontWeight: '700' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' },
  body: { color: '#d6d3d1', fontSize: 15, lineHeight: 21 },
  meta: { color: '#a8a29e', fontSize: 12 },
  message: { color: '#fbbf24', fontSize: 13 },
  primary: {
    backgroundColor: '#f5e070',
    borderRadius: 14,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#1a0e00', fontWeight: '900', letterSpacing: 2 },
  secondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#a8a29e', fontWeight: '700', letterSpacing: 1 },
});
