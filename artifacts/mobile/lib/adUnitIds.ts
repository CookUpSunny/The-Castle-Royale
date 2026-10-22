import { Platform } from 'react-native';

/**
 * Google's public test ad units. Production IDs are read from the environment
 * and must be set before an App Store build. Blank values keep these test IDs.
 */
export const GOOGLE_TEST_AD_UNITS = {
  iosApp: 'ca-app-pub-3940256099942544~1458002511',
  androidApp: 'ca-app-pub-3940256099942544~3347511713',
  iosInterstitial: 'ca-app-pub-3940256099942544/4411468910',
  androidInterstitial: 'ca-app-pub-3940256099942544/1033173712',
  iosRewarded: 'ca-app-pub-3940256099942544/1712485313',
  androidRewarded: 'ca-app-pub-3940256099942544/5224354917',
} as const;

function fromEnv(name: string, fallback: string): string {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

export function interstitialAdUnitId(): string {
  if (Platform.OS === 'android') {
    return fromEnv('EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID', GOOGLE_TEST_AD_UNITS.androidInterstitial);
  }
  return fromEnv('EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS', GOOGLE_TEST_AD_UNITS.iosInterstitial);
}

export function rewardedAdUnitId(): string {
  if (Platform.OS === 'android') {
    return fromEnv('EXPO_PUBLIC_ADMOB_REWARDED_ANDROID', GOOGLE_TEST_AD_UNITS.androidRewarded);
  }
  return fromEnv('EXPO_PUBLIC_ADMOB_REWARDED_IOS', GOOGLE_TEST_AD_UNITS.iosRewarded);
}

export function usesGoogleTestAds(): boolean {
  const interstitial = interstitialAdUnitId();
  const rewarded = rewardedAdUnitId();
  const testValues = Object.values(GOOGLE_TEST_AD_UNITS) as string[];
  return testValues.includes(interstitial) || testValues.includes(rewarded);
}
