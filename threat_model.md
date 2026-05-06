# Threat Model

## Project Overview

Castle Royale is a pnpm monorepo for a multiplayer mobile card game. The production surface is primarily an Expo client (`artifacts/mobile`) talking to a Node.js/Express + Socket.IO game server (`artifacts/api-server`). The server keeps live game, queue, and private-room state in memory and exposes a small HTTP API plus a larger real-time Socket.IO interface. The mockup sandbox under `artifacts/mockup-sandbox` is development-only and should be ignored unless production reachability is demonstrated.

## Assets

- **Live game state and game integrity** — active hands, turn order, hidden cards, and match outcomes. Exposure or manipulation breaks fair play.
- **Private room access** — 6-character invite codes and the ability to route a joiner to the intended host. Abuse allows unauthorized joins or disruption of invite-only matches.
- **Player identity binding** — the server’s mapping between a socket and a player identity. If that mapping is spoofable, attackers can hijack matches or receive another player’s state updates.
- **Service availability** — the queue, room creation/joining, and live matches depend on long-lived sockets and in-memory maps. Abuse can disrupt gameplay for all users.
- **Deployment secrets and infrastructure config** — environment variables such as database credentials and deployment hostnames must remain server-side.

## Trust Boundaries

- **Client ↔ Socket.IO server** — all gameplay and room actions cross this boundary. The client is untrusted and can emit arbitrary events or payloads.
- **Client ↔ HTTP server** — limited public HTTP surface (`/api/healthz` and the Expo static landing/server paths), but any reflected or traversal bug here is internet reachable.
- **Server ↔ in-memory authority** — gameplay correctness depends on server-side ownership of game state; client state must never be treated as authoritative.
- **Server ↔ external deployment/runtime environment** — environment variables, host/proxy headers, and deployment routing influence connection URLs and generated links.
- **Production ↔ dev-only artifacts** — `artifacts/mockup-sandbox`, build scripts, and local tooling are out of scope unless shown to be reachable in production.

## Scan Anchors

- Production entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/lib/socketGame.ts`, `artifacts/mobile/server/serve.js`
- Highest-risk code: `artifacts/api-server/src/lib/socketGame.ts`, `artifacts/api-server/src/lib/gameEngine.ts`, `artifacts/mobile/contexts/GameContext.tsx`, `artifacts/mobile/app/private-room.tsx`
- Public surface: Socket.IO events for queueing, bot play, room creation/joining, emotes, and gameplay; HTTP `/api/healthz`; Expo landing/static server
- Dev-only areas usually ignored: `artifacts/mockup-sandbox/**`, `artifacts/mobile/scripts/**`, local build tooling unless production reachability is demonstrated

## Threat Categories

### Spoofing

This project does not have user accounts or a server-verified session layer, so the main spoofing risk is whether a client can claim another player’s identity on the Socket.IO boundary. The system must ensure that a socket cannot impersonate an existing player in a way that lets it receive private game views, control another user’s match lifecycle, or take over room ownership.

### Tampering

All gameplay actions are client-originated and therefore attacker-controlled. The server must remain authoritative for turn order, card accessibility, setup choices, room consumption, and any state transition that affects match outcome. Client-side checks are cosmetic only and cannot be relied on for fairness.

### Information Disclosure

The game intentionally hides opponent hand contents and face-down cards. The server must only emit each player’s own view, must not leak hidden cards or internal state to the wrong socket, and must avoid exposing secrets or sensitive headers in logs and responses.

### Denial of Service

The application depends on long-lived sockets, in-memory maps, timers, and public room/queue actions. The service must tolerate abusive connection churn, repeated room or bot-game creation, and unsolicited public traffic without letting one client evict legitimate players or exhaust server memory or event-loop capacity.

### Elevation of Privilege

Because the game has no role model, elevation of privilege mostly means escalating from an arbitrary anonymous client to control over another player’s session or over server-side authoritative state. The server must bind actions to the correct live principal and reject attempts to act on games or rooms that do not belong to the caller.
