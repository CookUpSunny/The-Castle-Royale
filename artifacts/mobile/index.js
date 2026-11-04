// Explicit entry point for EAS cloud builds in pnpm monorepos.
// package.json "main" is this file so expo export:embed never falls back to
// expo/AppEntry.js, which has a relative ../../App import that breaks in
// pnpm's deep node_modules.
require('./lib/startupError').installStartupErrorHandler();
require('expo-router/entry');
