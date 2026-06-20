// Explicit entry point for EAS cloud builds in pnpm monorepos.
// Setting "main": "index.js" in package.json and "entryPoint" in app.json
// ensures expo export:embed never falls back to expo/AppEntry.js,
// which has a relative ../../App import that breaks in pnpm's deep node_modules.
require('expo-router/entry');
