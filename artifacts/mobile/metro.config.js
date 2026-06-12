const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the whole workspace so Metro can resolve shared libs
config.watchFolders = [workspaceRoot];

// Monorepo: prefer project-local node_modules, fall back to workspace root
// This fixes "Unable to resolve ../../App from expo/AppEntry.js" in pnpm workspaces
// where packages are stored in deep content-addressable paths (node_modules/.pnpm/...)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

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
