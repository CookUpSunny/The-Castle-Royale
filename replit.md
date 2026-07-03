# Castle Royale

An anime-style real-time multiplayer card game (Castle/Palace variant) playable on mobile via Expo Go, with bot opponents, private rooms, cosmetics, cinematic scene backgrounds, Apple Game Center integration, and a RevenueCat-powered premium subscription.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run API + Socket.io server (port 8080)
- `pnpm --filter @workspace/mobile run dev` — run Expo mobile dev server (port 18115)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — apply schema changes to Postgres
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 55, Expo Router, React Native 0.83, react-native-game-center
- API: Express 5 + Socket.io 4 (real-time game server)
- DB: PostgreSQL + Drizzle ORM (`players` table live)
- Validation: Zod, drizzle-zod
- Build: esbuild (API server CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app
  - `app/` — Expo Router screens (lobby, matchmaking, game, private-room, victory, arena-picker)
  - `components/` — UI components (GameLandscape, Card, SceneBackground, GlowPile, CosmeticsModal, PaywallModal, etc.)
  - `contexts/` — GameContext (socket state), GameCenterContext, CosmeticsContext, MusicContext
  - `lib/` — sfx.ts, scenePacks.ts, gameEngine types, visualPipeline, revenuecat.tsx (SubscriptionProvider/useSubscription)
  - `assets/` — casino art, scene backgrounds, avatars, audio SFX
- `artifacts/api-server/src/lib/` — gameEngine.ts, socketGame.ts, botPlayer.ts
- `artifacts/api-server/src/routes/players.ts` — player sync/fetch REST endpoints
- `lib/db/src/schema/players.ts` — players table schema
- `lib/api-spec/openapi.yaml` — REST API contract (health + player endpoints)

## Architecture decisions

- Game runs entirely over Socket.io (not REST); the OpenAPI spec covers health + player REST only
- `getGameView()` strips opponent hand cards for security (only count is sent)
- Socket.io path is `/api/socket.io` so it routes through the shared reverse proxy
- `EXPO_PUBLIC_DOMAIN` → main Replit dev domain; used to build absolute API URL for Expo Go native
- Music and SFX use `expo-audio` (guarded with try/catch require so missing native module in Expo Go degrades silently — never crashes the game)
- Scene backgrounds are multi-layer PNGs with parallax; missing layers degrade gracefully
- Game Center auth uses conditional `require('react-native-game-center')` — silently no-ops on Expo Go; only works in custom EAS builds
- `gameCenterId` is passed from the client in join events so the server can update player stats in DB after each game
- ELO uses standard K=32 formula; coins floor at 0
- **RevenueCat premium subscription** ($4.99/month, iOS App Store only, entitlement id `premium`, product `premium_monthly`): `lib/revenuecat.tsx` exposes `SubscriptionProvider` + `useSubscription()` (wraps `react-native-purchases`); `isSubscribed` gates premium cosmetics. `PaywallModal.tsx` is the shared upsell UI — price/product copy is always read live from `useSubscription().offerings`, never hardcoded. No free trial, no ads, no Android billing in scope.
- Gated features are **premium arenas** (`cosmic`, `royal`, `matrix`, `rainbowRoad`) and **premium card skins** in `CosmeticsContext.tsx` — tapping a locked item in `CosmeticsModal.tsx` or `arena-picker.tsx` opens `PaywallModal`. Spectate mode does not exist in the codebase (no screen, no server logic) despite once being described here — it is not gated because it isn't built.

## Product

- **Lobby** — pick a name, see connection status, access cosmetics; iOS shows "Sign in with Game Center"; Android shows anonymous-mode banner
- **Quick Play** — instant game vs AI bot opponent
- **Private Room** — create/join with 6-character invite code
- **Game** — full Castle card game with setup phase, face-down reveals, emotes, music, fire burst on burns
- **Cosmetics** — 10 card skins, 4 arenas, 4 character avatars; premium arenas/skins gated behind the RevenueCat subscription via `PaywallModal`
- **Victory** — win/loss screen with stats
- **Player Profiles** — coins, wins, losses, win-streak, ELO persisted in Postgres; updated after every game

## User preferences

_Populate as you build._

## Gotchas

- Audio files (assets/music/, assets/audio/) are placeholder silent WAVs — replace with real tracks
- Scene image layers beyond L0_far are transparent placeholders — generate or add real art
- Expo web preview renders a blank white screen with no console errors, independent of the RevenueCat work — confirmed pre-existing by temporarily disabling the RevenueCat wiring and seeing the same blank screen. Native via Expo Go is the reliable way to verify mobile UI; don't rely on the web preview for this app.
- Never change `path: '/api/socket.io'` in both socketGame.ts and GameContext — they must match
- Game Center only works in a custom EAS build (not Expo Go) — the app degrades to anonymous mode on Expo Go
- `react-native-purchases` runs in Preview API Mode on web/dev/Expo Go using the RevenueCat test API key (`EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`) — real purchases only work in a TestFlight/App Store build with the iOS key
- Pre-existing TypeScript errors in EmoteBubble (onComplete prop), SceneBackground, SplashCards, useColors — not from the RevenueCat work
- Run `pnpm install` after editing package.json files

## Pointers

- See `pnpm-workspace` skill for workspace structure and TypeScript setup
- See `expo` skill for mobile patterns and library compatibility
