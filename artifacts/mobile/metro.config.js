const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");

config.resolver.blockList = [
  /node_modules\/.*_tmp_.*\/.*/,
  /node_modules\/.pnpm\/.*_tmp_.*\/.*/,
];

// Prevent Metro from bundling Node.js-only canvaskit code on native platforms.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform !== "web" &&
    (moduleName.includes("canvaskit") || moduleName === "fs" || moduleName === "path" || moduleName === "os")
  ) {
    return { type: "empty" };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
