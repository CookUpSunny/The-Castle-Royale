# Castle Royale

An anime-style real-time multiplayer card game (Castle/Palace variant) playable on mobile via Expo Go, with bot opponents, private rooms, cosmetics, cinematic scene backgrounds, and Apple Game Center integration.

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
- Mobile: Expo SDK 54, Expo Router, React Native 0.81, react-native-game-center
- API: Express 5 + Socket.io 4 (real-time game server)
- DB: PostgreSQL + Drizzle ORM (`players` table live)
- Validation: Zod, drizzle-zod
- Build: esbuild (API server CJS bundle)

## Where things live

- `artifacts/mobile/` — Expo mobile app
  - `app/` — Expo Router screens (lobby, matchmaking, game, private-room, victory)
  - `components/` — UI components (GameLandscape, Card, SceneBackground, etc.)
  - `contexts/` — GameContext (socket), GameCenterContext (GC auth + profile), CosmeticsContext, MusicContext
  - `lib/` — sfx.ts, scenePacks.ts, gameEngine types, visualPipeline
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
- Music and SFX use `expo-av`; audio is best-effort (never crashes the game)
- Scene backgrounds are multi-layer PNGs with parallax; missing layers degrade gracefully
- Game Center auth uses conditional `require('react-native-game-center')` — silently no-ops on Expo Go; only works in custom EAS builds
- `gameCenterId` is passed from the client in join events so the server can update player stats in DB after each game
- ELO uses standard K=32 formula; coins floor at 0

## Product

- **Lobby** — pick a name, see connection status, access cosmetics; iOS shows "Sign in with Game Center"; Android shows anonymous-mode banner
- **Quick Play** — instant game vs AI bot opponent
- **Private Room** — create/join with 6-character invite code
- **Game** — full Castle card game with setup phase, face-down reveals, emotes, music
- **Cosmetics** — 10 card skins (5 unlocked), 4 arenas, 4 character avatars
- **Victory** — win/loss screen with stats
- **Player Profiles** — coins, wins, losses, win-streak, ELO persisted in Postgres; updated after every game

## User preferences

_Populate as you build._

## Gotchas

- Audio files (assets/music/, assets/audio/) are placeholder silent WAVs — replace with real tracks
- Scene image layers beyond L0_far are transparent placeholders — generate or add real art
- Socket.io WebSocket shows disconnected in web preview (Expo dev domain routing); works correctly on native via Expo Go
- Never change `path: '/api/socket.io'` in both socketGame.ts and GameContext — they must match
- Game Center only works in a custom EAS build (not Expo Go) — the app degrades to anonymous mode on Expo Go
- Run `pnpm install` after editing package.json files

## Pointers

- See `pnpm-workspace` skill for workspace structure and TypeScript setup
- See `expo` skill for mobile patterns and library compatibility
