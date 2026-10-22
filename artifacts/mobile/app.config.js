const appJson = require("./app.json");

/** Google's public sample App IDs. Real IDs come from EXPO_PUBLIC_ADMOB_* and are not committed. */
const GOOGLE_TEST_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";
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
            iosAppId: fromEnv("EXPO_PUBLIC_ADMOB_IOS_APP_ID", GOOGLE_TEST_IOS_APP_ID),
            delayAppMeasurementInit: true,
            userTrackingUsageDescription:
              "Castle Royale uses this identifier to show ads to free players. Subscribers and lifetime unlocks do not see forced ads.",
          },
        ],
      ],
    },
  };
};
