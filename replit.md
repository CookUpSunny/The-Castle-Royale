# Castle Royale

An anime-style real-time multiplayer card game (Castle/Palace variant) playable on mobile via Expo Go, with bot opponents, private rooms, cosmetics, and cinematic scene backgrounds.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run API + Socket.io server (port 8080)
- `pnpm --filter @workspace/mobile run dev` — run Expo mobile dev server (port 18115)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- Required env: `DATABASE_URL` — Postgres connection string (not yet used)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK 54, Expo Router, React Native 0.81
- API: Express 5 + Socket.io 4 (real-time game server)
- DB: PostgreSQL + Drizzle ORM (provisioned, not yet used by game)
- Validation: Zod, drizzle-zod
- Build: esbuild (API server CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app
  - `app/` — Expo Router screens (lobby, matchmaking, game, private-room, victory)
  - `components/` — UI components (GameLandscape, Card, SceneBackground, etc.)
  - `contexts/` — GameContext (socket), CosmeticsContext, MusicContext
  - `lib/` — sfx.ts, scenePacks.ts, gameEngine types, visualPipeline
  - `assets/` — casino art, scene backgrounds, avatars, audio SFX
- `artifacts/api-server/src/lib/` — gameEngine.ts, socketGame.ts, botPlayer.ts
- `lib/api-spec/openapi.yaml` — REST API contract (health only; game uses Socket.io)

## Architecture decisions

- Game runs entirely over Socket.io (not REST); the OpenAPI spec only covers the health endpoint
- `getGameView()` strips opponent hand cards for security (only count is sent)
- Socket.io path is `/api/socket.io` so it routes through the shared reverse proxy
- `EXPO_PUBLIC_DOMAIN` → main Replit dev domain; used to build absolute API URL for Expo Go native
- Music and SFX use `expo-av`; audio is best-effort (never crashes the game)
- Scene backgrounds are multi-layer PNGs with parallax; missing layers degrade gracefully

## Product

- **Lobby** — pick a name, see connection status, access cosmetics
- **Quick Play** — instant game vs AI bot opponent
- **Private Room** — create/join with 6-character invite code
- **Game** — full Castle card game with setup phase, face-down reveals, emotes, music
- **Cosmetics** — 10 card skins (5 unlocked), 4 arenas, 4 character avatars
- **Victory** — win/loss screen with stats

## User preferences

_Populate as you build._

## Gotchas

- Audio files (assets/music/, assets/audio/) are placeholder silent WAVs — replace with real tracks
- Scene image layers beyond L0_far are transparent placeholders — generate or add real art
- Socket.io WebSocket shows disconnected in web preview (Expo dev domain routing); works correctly on native via Expo Go
- Never change `path: '/api/socket.io'` in both socketGame.ts and GameContext — they must match
- Run `pnpm install` after editing package.json files

## Pointers

- See `pnpm-workspace` skill for workspace structure and TypeScript setup
- See `expo` skill for mobile patterns and library compatibility
