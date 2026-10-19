# Callsign: project brief

## What this is

Technical assignment for the Aviobook fullstack role: a real-time chat application matching the business case of the Connect application. The product is called **Callsign**. Chatrooms are called **nets**, and users are identified by a **callsign**.

Hard requirements from the assignment:

- Backend: Node.js + TypeScript, REST API for chatrooms, messages sent and received via WebSockets, chatrooms and messages stored in MongoDB.
- Frontend: React for web, React Native for mobile. Everything else in the stack is free of choice.

## Rules (always apply)

1. **Reuse first.** Before creating any component, check whether an existing one can be reused or composed.
2. **Tests from the start.** Every component, hook and service ships with tests.
3. **Best practices**, and **everything in TypeScript, fully typed** (strict mode, no `any`).
4. **Files max 300 lines.** Extract logic, styles and types into their own files.
5. **No repeated logic.** Reuse functions.
6. **Before every commit run the linter and a typecheck.**
7. **Keep a changelog** (`CHANGELOG.md`): one short line per commit.
8. Types must match the backend models (Node.js + MongoDB), see "Shared types".

## Scope (v1)

- Register, login, logout with callsign + passphrase. No roles.
- Create, join and leave public nets.
- Send and receive messages in a net in real time, with paginated history.

Out of scope for now: roles (Pilot/Crew/Ground), frequency numbers, message priority levels, signal strength, read receipts, unread counts, wind/visibility header, direct messages, private rooms.

Optional, only if time allows: "X is transmitting..." typing indicator (Socket.IO event only, never persisted).

## Stack

- Backend: **NestJS 12** (Express), Mongoose, Socket.IO gateway. Routes under `/api`, port 3000.
- Web: **Vite + React + Vitest**, **React Router 7**. No Next.js.
- Mobile: **Expo** (React Native), **Expo Router**.
- Shared UI: React Native primitives, rendered on web through **react-native-web**.
- Shared contract: **Zod** schemas in `packages/types`, types inferred with `z.infer`.
- Data fetching: **TanStack Query** inside the shared hooks; forms: **react-hook-form** through `useZodForm`.
- Monorepo: **pnpm workspaces + Turborepo**. Tests: Vitest (+ MSW), Jest + Supertest + mongodb-memory-server (API), jest-expo + RNTL (mobile).

**Architecture details** (API modules, auth and tokens, sockets, data models and indexes, shared hooks, error handling, routing, testing setup) are in `docs/architecture.md`. Read the relevant section before changing an area. Keep it up to date when a decision changes.

## Conventions that are easy to get wrong

- Strict TS, no `any`. TypeScript pinned to `~6.0`; TS 6 defaults `types` to `[]`, so every tsconfig lists its globals.
- The API compiles to CommonJS but Nest 12 is ESM-only: Node **≥24.9**, Jest with `--experimental-vm-modules`.
- API: services throw `ApiException(status, code, message)`. Validate with the shared schemas through `ZodValidationPipe` (HTTP) or `parseOrThrow` (sockets; handlers ack and never throw). Global guards/filters as `APP_GUARD` / `APP_FILTER`, never `app.useGlobal*`. Every route needs a token unless `@Public()`. Never `import type` an injected class.
- Sockets: type them only through `ChatServer` / `ChatSocket` (API) and `RealtimeSocket` (client). Only `RealtimeService` moves sockets or emits.
- Take `senderId` from the token, never from the client. Paginate every list endpoint.
- Shared hooks never import platform code: token storage, API URL, sockets and error reporting come in through `ApiPlatform`. Screens take navigation as callbacks and never import a router.
- Errors: `ApiClientError` is expected (shown inline with a retry); anything else is a bug, reported and thrown to the nearest `ScreenErrorBoundary`. Copy comes from `errorMessage(error)`.
- React, react-native-web, `@types/react` and `zod` come from the pnpm `catalog:`. Every package that imports `zod` declares it. Bump React only with an Expo SDK upgrade.
- `packages/types` is built with tsup (the API needs JS); `theme`, `ui`, `hooks`, `screens` are source-only.
- Tests never go inside Expo Router's `src/app/`.
- New env variables go in `apps/api/.env.example` and the Zod `envSchema`.
- Conventional Commits with an optional scope: `api`, `web`, `mobile`, `types`, `theme`, `ui`, `hooks`, `config`, `deps`, `ci`, `docs`.

## Repository layout

```
apps/
  api/       NestJS + MongoDB
  web/       Vite + React + Vitest
  mobile/    Expo (React Native)
packages/
  types/     Zod schemas + inferred TS types (API contract)
  theme/     design tokens
  ui/        shared components (React Native primitives)
  hooks/     shared hooks + typed API client (useSession, useLogin, useNets, useNetMessages, ...)
  screens/   shared screen bodies (forms, lists, chat), navigation through callbacks
  config/    shared eslint, tsconfig, prettier, vite
```

## Milestones

- **M0 Tooling:** workspaces, React version pinning, strict tsconfig base, ESLint with `max-lines: 300` and a no-raw-colors rule, Prettier, Husky + lint-staged, tsup build for `packages/types`, `docker-compose.yml` for MongoDB, `CHANGELOG.md`, one passing test per app, CI.
- **M1 Theme and UI library:** tokens, primitives, then composed components. Render `Button` and one `Card` in both apps, in light and dark with fonts loaded, first to de-risk react-native-web.
- **M2 Backend core:** validated env config, Mongo connection, Helmet, rate limiting. `users` module (unique callsign index, argon2) and `auth` module (register, login, refresh, logout, JWT guard).
- **M3 Rooms:** `rooms` and `memberships` modules: create, list (paginated), join, leave. Unique room name. When the last member leaves, the room is kept and stays listed under "Open to join" with 0 members (history is kept too).
- **M4 Messages and realtime:** `messages` module and Socket.IO gateway. Authenticate the socket handshake with the JWT, and keep socket rooms in sync with membership. Cursor-based pagination for history. On socket reconnect, the client invalidates the open chat's messages query (Socket.IO does not replay missed events).
- **M5 Frontend integration:** typed API client, auth flow, nets list, chat screen (web first, then mobile).
- **M6 Polish:** error and empty states, reconnect handling, accessibility pass, README.

## Shared types

Define shapes once in `packages/types` as Zod schemas and infer the TS types. The API validates requests with the same schemas, and both apps use them for forms and response parsing. Zod describes the API contract, not the database: Mongoose schemas stay in `apps/api`, and a mapper converts a Mongoose document to the shared type (separate `MessageDto` from the document type).

## Design

Modern field-radio style, light and dark: olive/brass palette, stencil, typewriter and mono fonts, radio copy tone. The full spec (mockups and what in them is out of scope, theming, color tokens, components, screens) is in `docs/design/README.md`. Read it before building or changing UI.

- Every value comes from `packages/theme`; raw hex/rgba only in `colors.light.ts` / `colors.dark.ts`. Components use token names through `createStyles((theme) => ...)`.
- No gradients, no textures, no glows in v1; one approved exception: the radar sweep on the mobile splash. No `.native` / `.web` component splits.
- Each component in its own folder: `X.tsx`, `X.styles.ts`, `X.types.ts`, `X.test.tsx`.
- Screens own safe-area insets; components never pad for the notch.
- Accessibility: touch targets at least 44, real labels on inputs, `accessibilityLabel` on icon-only buttons, text contrast at least 4.5:1 in both schemes.
