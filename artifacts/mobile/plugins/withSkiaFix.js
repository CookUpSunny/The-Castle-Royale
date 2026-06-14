const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSkiaFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const patch = `
# Fix: @shopify/react-native-skia cpp/api header search path
post_install do |installer|
  installer.pods_project.targets.each do |target|
    if target.name == 'react-native-skia'
      target.build_configurations.each do |config|
        config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
        unless config.build_settings['HEADER_SEARCH_PATHS'].include?('$(PODS_TARGET_SRCROOT)/cpp/api')
          config.build_settings['HEADER_SEARCH_PATHS'] += ' $(PODS_TARGET_SRCROOT)/cpp/api'
        end
      end
    end
  end
end
`;

      if (!podfile.includes('react-native-skia') || !podfile.includes('PODS_TARGET_SRCROOT)/cpp/api')) {
        podfile = podfile + patch;
        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};
