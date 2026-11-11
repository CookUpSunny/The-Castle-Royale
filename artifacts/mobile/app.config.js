/**
 * Live AdMob iOS app (publisher pub-2426597243989008), linked to App Store ID 6772010192.
 * This App ID is public. Ad unit selection lives in lib/adUnitIds.ts.
 *
 * `config` is the static app.json config Expo passes in. Spreading it keeps
 * splash, bundle id, and plugins on the object Expo actually evaluates.
 */
const ADMOB_IOS_APP_ID = "ca-app-pub-2426597243989008~4741781660";
const GOOGLE_TEST_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";
const TRACKING_USAGE =
  "Castle Royale uses this identifier to show ads to free players. High Roller and VIP members do not see forced ads.";

function fromEnv(name, fallback) {
  const value = process.env[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    "expo-video",
    [
      "expo-tracking-transparency",
      { userTrackingPermission: TRACKING_USAGE },
    ],
    "./plugins/withAppleMusicKit",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: fromEnv("EXPO_PUBLIC_ADMOB_ANDROID_APP_ID", GOOGLE_TEST_ANDROID_APP_ID),
        iosAppId: fromEnv("EXPO_PUBLIC_ADMOB_IOS_APP_ID", ADMOB_IOS_APP_ID),
        delayAppMeasurementInit: true,
        userTrackingUsageDescription: TRACKING_USAGE,
      },
    ],
  ],
});
