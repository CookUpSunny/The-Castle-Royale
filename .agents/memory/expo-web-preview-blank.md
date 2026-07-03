---
name: Expo web preview blank screen (Castle Royale mobile)
description: The Expo Router web preview for artifacts/mobile renders a blank white screen with zero console errors, unrelated to app code changes — don't chase this as a regression.
---

The web preview for `artifacts/mobile` (an Expo Router app) can render a completely blank white page with no JavaScript console errors, no bundling errors, and a 200 response for the bundle. This was confirmed to be pre-existing/environmental, not caused by application code: disabling a newly-added top-level provider (RevenueCat's `SubscriptionProvider` + `initializeRevenueCat()` call) and restarting did not fix it — the screen stayed blank either way.

**Why:** Expo Router + react-native-web in this workspace's Metro/proxy setup does not reliably render in the browser-based screenshot/testing tools, even though `curl` shows the HTML/JS bundle loading fine and `node --check` confirms the bundle has valid syntax. The `runTest()` Playwright subagent also reports an empty aria snapshot with no console errors — it's not a thrown exception, the app just never paints.

**How to apply:** Don't burn time debugging this as if it were a regression in your own change. To verify Expo mobile UI/features, trust `pnpm --filter @workspace/mobile run typecheck` plus careful manual code review of gating/render logic, and note in your completion report that native (Expo Go) is the reliable verification path, not the web preview. If you must visually confirm something, expect the web preview may not help and say so rather than assuming your code broke it.
