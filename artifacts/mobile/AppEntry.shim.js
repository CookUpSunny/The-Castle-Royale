// This file is loaded by expo/AppEntry.js in pnpm workspace EAS builds.
// expo/AppEntry does: import App from '../../App'; registerRootComponent(App);
// The relative path '../../App' can't resolve from inside node_modules/.pnpm/expo@.../
// so metro.config.js redirects that import here.
//
// We replicate what expo-router/entry-classic does:
//   1. Run @expo/metro-runtime side-effects (HMR / fast-refresh setup)
//   2. Export the Expo Router root App component as default
import '@expo/metro-runtime';
export { App as default } from 'expo-router/build/qualified-entry';
