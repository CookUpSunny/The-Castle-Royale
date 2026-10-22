import { Platform } from 'react-native';

/** Google's public sample units. Safe for dev, Expo Go, and internal EAS builds. */
export const GOOGLE_TEST_AD_UNITS = {
  iosApp: 'ca-app-pub-3940256099942544~1458002511',
  androidApp: 'ca-app-pub-3940256099942544~3347511713',
  iosInterstitial: 'ca-app-pub-3940256099942544/4411468910',
  androidInterstitial: 'ca-app-pub-3940256099942544/1033173712',
  iosRewarded: 'ca-app-pub-3940256099942544/1712485313',
  androidRewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

/**
 * Live iOS units. Public config.
 * Interstitial: "Castle Royale - Between Matches Interstitial".
 * Rewarded: "Castle Royale - Second Chance Rewarded" (reward amount 1, item "Second Chance").
 * Used only by production / TestFlight release builds.
 */
export const CASTLE_ROYALE_IOS_AD_UNITS = {
  interstitial: 'ca-app-pub-2426597243989008/9295637094',
  rewarded: 'ca-app-pub-2426597243989008/7498419820',
} as const;

function fromEnv(name: string, fallback: string): string {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

/**
 * Test units in Metro (__DEV__) and in internal EAS builds
 * (development and preview set EXPO_PUBLIC_ADMOB_USE_TEST_UNITS=true).
 * Production and TestFlight leave that flag unset and use the real iOS units.
 */
export function useTestAdUnits(): boolean {
  if (__DEV__) return true;
  const flag = process.env.EXPO_PUBLIC_ADMOB_USE_TEST_UNITS;
  return flag === '1' || flag === 'true';
}

export function interstitialAdUnitId(): string {
  if (Platform.OS === 'android') {
    return fromEnv('EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID', GOOGLE_TEST_AD_UNITS.androidInterstitial);
  }
  if (useTestAdUnits()) return GOOGLE_TEST_AD_UNITS.iosInterstitial;
  return fromEnv('EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS', CASTLE_ROYALE_IOS_AD_UNITS.interstitial);
}

export function rewardedAdUnitId(): string {
  if (Platform.OS === 'android') {
    return fromEnv('EXPO_PUBLIC_ADMOB_REWARDED_ANDROID', GOOGLE_TEST_AD_UNITS.androidRewarded);
  }
  if (useTestAdUnits()) return GOOGLE_TEST_AD_UNITS.iosRewarded;
  return fromEnv('EXPO_PUBLIC_ADMOB_REWARDED_IOS', CASTLE_ROYALE_IOS_AD_UNITS.rewarded);
}

export function usesGoogleTestAds(): boolean {
  return useTestAdUnits() || Platform.OS === 'android';
}
