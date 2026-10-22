export type RevenueCatPlatform = "ios" | "android" | "web" | "other";

export interface RevenueCatKeyInput {
  platform: RevenueCatPlatform;
  /** Dev builds, web, and Expo Go can fall back to the iOS key. */
  usePreviewKey: boolean;
  testKey?: string | null;
  iosKey?: string | null;
  androidKey?: string | null;
}

function present(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Pick the RevenueCat public SDK key.
 * A store iOS build needs only the iOS key. Android and the test key are optional.
 */
export function selectRevenueCatApiKey(input: RevenueCatKeyInput): string {
  const testKey = present(input.testKey);
  const iosKey = present(input.iosKey);
  const androidKey = present(input.androidKey);

  if (input.usePreviewKey) {
    if (testKey) return testKey;
    if (input.platform === "android" && androidKey) return androidKey;
    if (iosKey) return iosKey;
    throw new Error("RevenueCat public API key not found");
  }

  if (input.platform === "ios") {
    if (!iosKey) throw new Error("RevenueCat iOS public API key not found");
    return iosKey;
  }

  if (input.platform === "android") {
    if (!androidKey) throw new Error("RevenueCat Android public API key not found");
    return androidKey;
  }

  if (iosKey) return iosKey;
  throw new Error("RevenueCat public API key not found");
}
