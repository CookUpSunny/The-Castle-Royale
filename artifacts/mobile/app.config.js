const appJson = require("./app.json");

/**
 * Live AdMob iOS app (publisher pub-2426597243989008), linked to App Store ID 6772010192.
 * This App ID is public. Ad units do not exist yet, so those stay on Google's test IDs.
 */
const ADMOB_IOS_APP_ID = "ca-app-pub-2426597243989008~4741781660";
const GOOGLE_TEST_ANDROID_APP_ID = "ca-app-pub-3940256099942544~3347511713";

function fromEnv(name, fallback) {
  const value = process.env[name];
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

module.exports = () => {
  const expo = appJson.expo;
  return {
    expo: {
      ...expo,
      plugins: [
        ...(expo.plugins ?? []),
        [
          "react-native-google-mobile-ads",
          {
            androidAppId: fromEnv("EXPO_PUBLIC_ADMOB_ANDROID_APP_ID", GOOGLE_TEST_ANDROID_APP_ID),
            iosAppId: fromEnv("EXPO_PUBLIC_ADMOB_IOS_APP_ID", ADMOB_IOS_APP_ID),
            delayAppMeasurementInit: true,
            userTrackingUsageDescription:
              "Castle Royale uses this identifier to show ads to free players. High Roller and VIP members do not see forced ads.",
          },
        ],
      ],
    },
  };
};
