const { createRunOncePlugin, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * MusicKit for EAS-managed credentials.
 *
 * The usage string is required before the system permission dialog. Without it,
 * iOS terminates the app on the first authorization request.
 *
 * com.apple.developer.musickit must be on the signed entitlements. EAS keeps
 * using its managed certificate and profile. The profile can only include this
 * entitlement after the MusicKit App Service is enabled on the App ID. See
 * docs/MUSICKIT.md. This plugin does not switch the project to local credentials.
 */
const USAGE_DESCRIPTION =
  'Castle Royale streams arena songs from Apple Music so the artist is paid for the play. Apple Music is optional. Built-in music plays if you decline or cannot stream.';

function withAppleMusicKit(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.NSAppleMusicUsageDescription = USAGE_DESCRIPTION;
    return mod;
  });

  config = withEntitlementsPlist(config, (mod) => {
    mod.modResults['com.apple.developer.musickit'] = true;
    return mod;
  });

  return config;
}

module.exports = createRunOncePlugin(withAppleMusicKit, 'with-apple-music-kit', '1.0.0');
