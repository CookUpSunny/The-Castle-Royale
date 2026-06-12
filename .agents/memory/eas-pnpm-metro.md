---
name: EAS pnpm workspace Metro fix
description: EAS cloud builds fail with expo/AppEntry.js resolution error in pnpm monorepos; fix is metro.config.js watchFolders + nodeModulesPaths.
---

## The rule

Any Expo app in a pnpm workspace that EAS-builds must have `watchFolders` and `resolver.nodeModulesPaths` pointing at the workspace root in `metro.config.js`.

**Why:** pnpm stores packages in deep content-addressable paths (`node_modules/.pnpm/<hash>/node_modules/expo/`). `expo/AppEntry.js` contains `import App from '../../App'` — a relative import that resolves correctly in npm/yarn (`node_modules/expo/` → `../../App` = project root) but resolves to a nonsense path deep inside `.pnpm/`. EAS cloud build servers always use a fresh `pnpm install`, exposing this every time.

**How to apply:**

```js
const path = require("path");
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
```

Place these lines right after `getDefaultConfig(projectRoot)` in `metro.config.js`. Already applied in `artifacts/mobile/metro.config.js`.
