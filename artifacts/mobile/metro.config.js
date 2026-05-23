const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /node_modules\/.*_tmp_.*\/.*/,
  /node_modules\/.pnpm\/.*_tmp_.*\/.*/,
];

module.exports = config;
