#!/bin/bash
set -e

echo "=== Post-build cleanup ==="

# 1. Prune pnpm content-addressable store (removes unreferenced package files)
echo "Pruning pnpm store..."
pnpm store prune

# 2. Remove pnpm store entirely — not needed at runtime
PNPM_STORE=$(pnpm store path 2>/dev/null || echo "")
if [ -n "$PNPM_STORE" ] && [ -d "$PNPM_STORE" ]; then
  echo "Removing pnpm store at $PNPM_STORE..."
  rm -rf "$PNPM_STORE"
fi

# 3. Remove all node_modules — neither production runtime needs them:
#    - API server: fully bundled by esbuild into dist/index.mjs (self-contained)
#    - Mobile serve: zero-dependency server using only Node.js built-ins (http, fs, path)
echo "Removing workspace node_modules..."
rm -rf node_modules
rm -rf artifacts/api-server/node_modules
rm -rf artifacts/mobile/node_modules
rm -rf artifacts/mockup-sandbox/node_modules

# lib/* and scripts may have node_modules too
find lib -maxdepth 2 -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true
find scripts -maxdepth 2 -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null || true

# 4. Remove API server source maps (not needed in production, saves ~8 MB)
echo "Removing source maps..."
rm -f artifacts/api-server/dist/*.map

echo "=== Cleanup complete ==="
