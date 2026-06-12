const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch the whole workspace so Metro can resolve shared libs
config.watchFolders = [workspaceRoot];

// Monorepo: prefer project-local node_modules, fall back to workspace root.
// Helps bare-module resolution in pnpm workspaces.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.assetExts.push("wasm");

config.resolver.blockList = [
  /node_modules\/.*_tmp_.*\/.*/,
  /node_modules\/.pnpm\/.*_tmp_.*\/.*/,
];

// Custom resolver: handles two problems
//   1. pnpm workspace fix — expo/AppEntry.js does `import App from '../../App'`.
//      In pnpm, expo lives deep in node_modules/.pnpm/<hash>/node_modules/expo/ so
//      the relative path resolves to a nonsense location inside the store.
//      We intercept it and redirect to our shim which exports the Expo Router root.
//   2. Prevent Metro from bundling Node.js-only canvaskit / fs / path / os on native.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix 1: intercept expo/AppEntry's ../../App relative import
  if (
    moduleName === "../../App" &&
    context.originModulePath &&
    context.originModulePath.includes("/expo/AppEntry")
  ) {
    return {
      filePath: path.resolve(projectRoot, "AppEntry.shim.js"),
      type: "sourceFile",
    };
  }

  // Fix 2: stub Node-only modules on native platforms
  if (
    platform !== "web" &&
    (moduleName.includes("canvaskit") ||
      moduleName === "fs" ||
      moduleName === "path" ||
      moduleName === "os")
  ) {
    return { type: "empty" };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
