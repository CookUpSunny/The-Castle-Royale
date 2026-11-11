import { Platform } from 'react-native';
import { interstitialAdUnitId, rewardedAdUnitId } from '@/lib/adUnitIds';
import { personalizedAdsAllowed } from '@/lib/trackingConsent';

type AdsModule = typeof import('react-native-google-mobile-ads');
type TrackingModule = typeof import('expo-tracking-transparency');

let adsModule: AdsModule | null | undefined;
let initialized = false;
let nonPersonalized = false;
let preparePromise: Promise<void> | null = null;

function loadAds(): AdsModule | null {
  if (adsModule !== undefined) return adsModule;
  if (Platform.OS === 'web') {
    adsModule = null;
    return null;
  }
  try {
    // Native module. Missing in Expo Go and on web; callers degrade without crashing.
    adsModule = require('react-native-google-mobile-ads') as AdsModule;
    return adsModule;
  } catch {
    adsModule = null;
    return null;
  }
}

export function adsAvailable(): boolean {
  return loadAds() !== null;
}

function loadTracking(): TrackingModule | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return require('expo-tracking-transparency') as TrackingModule;
  } catch {
    return null;
  }
}

/**
 * Ask for tracking only after the home screen is up, then start AdMob.
 * A decline or a missing prompt still starts ads, and those requests stay
 * non-personalized.
 */
export function prepareAdsAfterTrackingPrompt(): Promise<void> {
  if (!preparePromise) preparePromise = runPrepare();
  return preparePromise;
}

async function runPrepare(): Promise<void> {
  nonPersonalized = Platform.OS === 'ios' && !(await iosTrackingGranted());
  await initializeAds();
}

async function iosTrackingGranted(): Promise<boolean> {
  const tracking = loadTracking();
  if (!tracking) return false;
  try {
    const current = await tracking.getTrackingPermissionsAsync();
    if (current.status !== 'undetermined') return personalizedAdsAllowed(current.status);
    const next = await tracking.requestTrackingPermissionsAsync();
    return personalizedAdsAllowed(next.status);
  } catch {
    return false;
  }
}

export async function initializeAds(): Promise<void> {
  const ads = loadAds();
  if (!ads || initialized) return;
  try {
    await ads.default().initialize();
    initialized = true;
  } catch (err) {
    console.warn('AdMob unavailable:', err instanceof Error ? err.message : err);
  }
}

function adRequestOptions<T extends Record<string, unknown>>(extra?: T) {
  return {
    requestNonPersonalizedAdsOnly: nonPersonalized,
    ...extra,
  };
}

export async function showInterstitialAd(): Promise<boolean> {
  const ads = loadAds();
  if (!ads) return false;
  const { AdEventType, InterstitialAd } = ads;
  const interstitial = InterstitialAd.createForAdRequest(interstitialAdUnitId(), adRequestOptions());
  return new Promise((resolve) => {
    let settled = false;
    const finish = (shown: boolean) => {
      if (settled) return;
      settled = true;
      unsubLoaded();
      unsubClosed();
      unsubError();
      resolve(shown);
    };
    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      void interstitial.show().catch(() => finish(false));
    });
    const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => finish(true));
    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => finish(false));
    interstitial.load();
    setTimeout(() => finish(false), 12000);
  });
}

export async function showRewardedAd(input: { userId: string; customData: string }): Promise<'earned' | 'closed' | 'unavailable'> {
  const ads = loadAds();
  if (!ads) return 'unavailable';
  const { AdEventType, RewardedAd, RewardedAdEventType } = ads;
  const rewarded = RewardedAd.createForAdRequest(
    rewardedAdUnitId(),
    adRequestOptions({
      serverSideVerificationOptions: {
        userId: input.userId,
        customData: input.customData,
      },
    }),
  );

  return new Promise((resolve) => {
    let settled = false;
    let earned = false;
    const finish = (result: 'earned' | 'closed' | 'unavailable') => {
      if (settled) return;
      settled = true;
      unsubLoaded();
      unsubEarned();
      unsubClosed();
      unsubError();
      resolve(result);
    };
    const unsubLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      void rewarded.show().catch(() => finish('unavailable'));
    });
    const unsubEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unsubClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      finish(earned ? 'earned' : 'closed');
    });
    const unsubError = rewarded.addAdEventListener(AdEventType.ERROR, () => finish('unavailable'));
    rewarded.load();
    setTimeout(() => finish('unavailable'), 20000);
  });
}
