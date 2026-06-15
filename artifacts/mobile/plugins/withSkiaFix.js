const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSkiaFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Sentinel: if our broader cpp root path is already present, skip.
      if (podfile.includes('$(PODS_TARGET_SRCROOT)/cpp ')) {
        return config;
      }

      const skiaInject = `
  # Fix: @shopify/react-native-skia missing cpp header search paths
  # Needed for: cpp/api/*.h (RNSkia API), cpp/third_party/base64.h, etc.
  installer.pods_project.targets.each do |target|
    if target.name.include?('react-native-skia')
      target.build_configurations.each do |build_config|
        existing = build_config.build_settings['HEADER_SEARCH_PATHS'] || '$(inherited)'
        unless existing.include?('$(PODS_TARGET_SRCROOT)/cpp ')
          build_config.build_settings['HEADER_SEARCH_PATHS'] = existing + ' $(PODS_TARGET_SRCROOT)/cpp $(PODS_TARGET_SRCROOT)/cpp/api'
        end
      end
    end
  end
`;

      if (podfile.includes('post_install do |installer|')) {
        podfile = podfile.replace(
          'post_install do |installer|',
          'post_install do |installer|' + skiaInject
        );
      } else {
        podfile += '\npost_install do |installer|\n' + skiaInject + '\nend\n';
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
