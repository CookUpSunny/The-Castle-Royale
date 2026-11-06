const { createRunOncePlugin, withInfoPlist } = require('@expo/config-plugins');

/**
 * MusicKit usage string for the shipping App ID app.replit.thecastleroyale.
 *
 * MusicKit is an App Service on that App ID. Apple does not issue a MusicKit
 * key in the provisioning profile, and Expo's capability list has no MusicKit
 * entitlement to sync. Writing one makes codesign fail because the profile can
 * never include it. Enabling the App Service is a portal save this plugin does
 * not perform. See docs/MUSICKIT.md.
 *
 * The usage string is required before the system permission dialog. Without it,
 * iOS terminates the app on the first authorization request. EAS keeps its
 * managed certificate and profile. This plugin does not switch the project to
 * local credentials.
 */
const USAGE_DESCRIPTION =
  'Castle Royale streams arena songs from Apple Music so the artist is paid for the play. Apple Music is optional. Built-in music plays if you decline or cannot stream.';

function withAppleMusicKit(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.NSAppleMusicUsageDescription = USAGE_DESCRIPTION;
    return mod;
  });
}

module.exports = createRunOncePlugin(withAppleMusicKit, 'with-apple-music-kit', '1.1.0');
