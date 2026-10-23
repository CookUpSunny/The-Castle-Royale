/** Web has no AdMob native module. The iOS and Android file loads the SDK. */

export function adsAvailable(): boolean {
  return false;
}

export async function initializeAds(): Promise<void> {}

export async function showInterstitialAd(): Promise<boolean> {
  return false;
}

export async function showRewardedAd(_input: {
  userId: string;
  customData: string;
}): Promise<"earned" | "closed" | "unavailable"> {
  return "unavailable";
}
