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

## Decisions made

- Backend: **NestJS 12** (Express under the hood), Mongoose for MongoDB, Socket.IO gateway for WebSockets.
  - The API itself compiles to **CommonJS** (`module: nodenext`, no `"type": "module"`), but Nest 12's packages are **ESM-only**. This works because Node can `require()` ES modules natively, hence Node **≥24.9** (`engines`, `.nvmrc`). Jest needs `NODE_OPTIONS=--experimental-vm-modules` for the same reason (set in the API's `test` scripts).
  - API tsconfig: extends the shared base, then `module`/`moduleResolution: nodenext`, `noEmit: false`, `rootDir: "."` (TS 6 no longer infers it), `outDir: dist`, `experimentalDecorators` + `emitDecoratorMetadata` (Nest DI reads constructor types at runtime). `tsconfig.build.json` narrows `rootDir` to `src`.
  - All routes are under the global prefix `/api` (`app.setGlobalPrefix('api')`), port 3000.
  - `src/configure-app.ts` holds the app-level setup (prefix, Helmet, cookie-parser, CORS) and is called by both `main.ts` and the e2e helper `test/create-test-app.ts`, so tests run the same app. Global guards and filters go in `AppModule` as `APP_GUARD` / `APP_FILTER` (DI), never `app.useGlobal*`.
  - Errors: services throw `ApiException(status, code, message)` (`src/common/errors/`). The global `ApiExceptionFilter` maps everything to `ApiError`; Nest's own exceptions get a code from their status, unknown errors become a generic 500 `INTERNAL_ERROR` (details only in the log).
  - Rate limiting: `@nestjs/throttler`, global 100/min per IP, in memory, through `HttpThrottlerGuard` (skips socket events; `message:send` has its own per-socket limit).
  - Sockets (`src/realtime/`): `CorsIoAdapter` (set in `configureApp`) gives Socket.IO the web origin, `serveClient: false` and a 16 KB payload cap. The gateway lives in `MessagesModule`; its `afterInit` adds two handshake middlewares: `authenticateSocket` (`auth.token` → `socket.data.user`) and `joinRoomsOnConnect` (`user:<id>` first, then `room:<id>` per net). Errors become `connect_error` with the code as message and the `ApiError` as `data` (`toSocketMiddleware`). `RealtimeService` (`RealtimeModule`, a leaf module) holds the server (attached by the gateway in `afterInit`) and is the only place that moves sockets or emits: `joinUserToNet` / `removeUserFromNet` (called by `RoomsService.join`/`leave` on every call, repeated ones too), `broadcastMessage`, `broadcastRoomUpdate` (only when the count changed). Global guards also run on socket events, so `JwtAuthGuard` and `HttpThrottlerGuard` let the `ws` context through. Type sockets only with the `ChatServer` / `ChatSocket` aliases (`chat-server.types.ts`), never with raw generics. Event handlers take `@MessageBody() payload: unknown`, validate with `parseOrThrow(schema, payload)` (the function behind `ZodValidationPipe`; pipes on sockets would bypass the ack), call the ack themselves through `@Ack()` and never throw: every error becomes `{ ok: false, error: toLoggedApiError(e, logger) }`.
  - Auth: no Passport. `JwtAuthGuard` is a global `APP_GUARD` (after `HttpThrottlerGuard`), so every route needs a Bearer token unless marked `@Public()` (route or controller). Read the user with `@CurrentUser() user: AuthUser` (`{ userId, callsign }`). `TokensService.verifyAccessToken` is the one token check, for HTTP and the socket handshake.
- Web: **Vite + React + Vitest**. No Next.js.
- Mobile: **Expo** (React Native).
- Shared UI: one component library written with React Native primitives, rendered on web through **react-native-web**.
- Shared screens (`packages/screens`, source-only): screen bodies used by both apps (`SignInScreen`, `RegisterScreen`, `UnreachableScreen`, `RestoringScreen`, ...). They take navigation as callbacks (`onRegister`, `onBack`) and never import a router; a successful sign-in needs no callback because the session changes and the app's guard moves on. `errorMessage(error)` maps every `ClientErrorCode` to copy in one place.
  - Forms: **react-hook-form** through `useZodForm(schema, defaults)` (zodResolver over the shared schema: fields hold the typed input, submit gets the parsed output) and `FormInput` (`Controller` + `Input`). Field messages come from the shared schemas (`atLeastChars` / `atMostChars` in `packages/types`), so forms and the API's `VALIDATION_FAILED` say the same thing. A taken callsign goes under its field (`setError`); other failures show in `FormError`.
- Shared contract: **Zod** schemas in a shared package, with TypeScript types inferred from them (`z.infer`).
- Shared hooks and the API client live in `packages/`, not in the apps (single source of truth). Platform-specific parts (token storage, API base URL) are injected through a provider, never imported directly in hooks.
  - `ApiProvider({ platform })` (`packages/hooks`) creates the API client and the `QueryClient` once. `platform` is a `ApiPlatform`: `{ apiUrl, client: 'web' }` or `{ apiUrl, client: 'mobile', refreshTokenStore }`, plus an optional `runExclusive` (web: Web Locks, so two tabs never refresh with the same cookie). `apiUrl` is the origin without `/api` (empty on web, through the Vite proxy).
  - API client (`createApiClient`): thin `fetch` wrapper. Paths have no `/api` prefix; every response is parsed with the shared schema (`request(req, schema)`, `requestNoContent` for 204). Failures always reject with `ApiClientError` (`status`, `code`: the API's `ErrorCode` plus `NETWORK_ERROR` and `INVALID_RESPONSE`). The access token lives inside the client (memory only, never React state). A 401 runs one shared refresh (reusing a token another call already refreshed) and retries once; `auth: false` for `/auth/*`. Only a 401 from `/auth/refresh` ends the session (`onSessionEnd`); offline or 5xx keep it. `logout()` waits for a refresh in flight, revokes on the API best effort (offline still signs out locally), then forgets the tokens. Every sign-in/sign-out bumps a generation counter, so a refresh answer that arrives after a newer login is dropped (neither its token nor its 401 replaces the new session).
  - Session (`src/session/`): `createSessionStore` is plain TS read through `useSyncExternalStore` (`useSession()` → `restoring | unreachable | signedOut | signedIn(user)`; `useSignedInUser()` behind the guard). The provider's effect calls `start()`: restore from the refresh token once (StrictMode-safe), and sign out when the client reports the session ended. `unreachable` = the restore got no answer about the session (offline, 5xx): show a retry (`retryRestore`), not the sign-in screen. Every change of user clears the query cache. `useLogin` / `useRegister` / `useLogout` are mutations; their errors are `ApiClientError`s (`INVALID_CREDENTIALS`, `CALLSIGN_TAKEN`, ...). A restore result is applied only if no sign-in overtook it.
  - Query defaults (`createQueryClient`): queries retry only `NETWORK_ERROR` and 5xx, twice; mutations never retry; `staleTime` 30 s.
  - `@callsign/hooks/testing` (never imported by app code): the MSW `server` with `setupApiTestServer()` for a test setup file, `api(path)`, fixtures (`wolf`, `authResponse`, `apiError`, `webPlatform`, `mobilePlatform`, `MemoryTokenStore`), `createTestClients()` and `renderHookWithApiProvider`. Packages that test against the API add `msw` as a dev dependency.
- Rooms are public, there is no role field, and rooms have no frequency number.
- Monorepo: **pnpm workspaces + Turborepo** (`nodeLinker: hoisted` in `pnpm-workspace.yaml` for Expo).
- Shared package builds: `packages/types` is **built with tsup** (ESM + CJS in `dist/`) because the NestJS API runs compiled JS under plain Node and cannot import TS source. `theme`, `ui` and `hooks` stay **source-only** (consumed only by Vite and Metro). Turbo runs `^build` before `typecheck`, `test` and `dev`.
  - `exports` maps `require` → `dist/index.cjs` + `.d.cts` (API) and `import` → `dist/index.js` + `.d.ts` (Vite, Metro, Vitest).
  - tsup's declaration build sets `baseUrl` internally, which TS 6 deprecates, so `tsup.config.ts` passes `ignoreDeprecations: '6.0'` to the dts step. tsup is in maintenance mode; **tsdown** is the drop-in successor if it causes more trouble.
- One React version: `react`, `react-dom`, `react-test-renderer`, `react-native-web`, `react-native-svg`, `@types/react` and `@types/react-dom` live in the default pnpm `catalog:` in `pnpm-workspace.yaml`, pinned to what the Expo SDK expects (React 19.2.3 for SDK 57). Apps reference them as `"catalog:"`. Bump only together with an Expo SDK upgrade.
  - `zod` is in the catalog too (not tied to Expo). Every package that imports `zod` declares it as `"catalog:"`: the hoisted root copy is Zod 3 (pulled in by another dependency), so an undeclared import silently gets the wrong major.
  - Libraries must support that React version: **React Router 7** (v8 needs React ≥19.2.7), **React Native Testing Library 13** with `react-test-renderer` (v14 needs React 19.3).
  - Known harmless peer warning: `@react-native/metro-config` 0.87 vs 0.86 (optional peer of the RN CLI; Expo uses its own Metro config).
- Pagination (`src/common/pagination/`): `encodeCursor` wraps the sort key (net name, message id) in base64url so cursors are opaque; `decodeCursor(cursor, schema)` only accepts cursors that encode back to themselves and checks the key with a schema (400 `VALIDATION_FAILED` otherwise). Queries fetch `pageFetchLimit(limit)` (= limit + 1) rows and `toPage` drops the extra one to decide `nextCursor`, so no `count` query.
- API validation: the shared Zod schemas, through our own `ZodValidationPipe` (`src/common/pipes/`, per parameter: `@Body(new ZodValidationPipe(schema))`; returns the parsed, normalized value). No `class-validator`, no `nestjs-zod`.
- TypeScript pinned to `~6.0` (typescript-eslint supports `<6.1`; TS 7's native compiler is not yet supported by the tooling). TS 6 defaults `types` to `[]`, so every tsconfig lists its globals explicitly (e.g. `["jest"]` on mobile, `["node", "jest"]` on the API, `["vite/client"]` on web).
- Tests: in `src/__tests__/` or next to the code, but never inside Expo Router's `src/app/` (every file there becomes a route).
- Linting: one root `eslint.config.js` (re-exports `@callsign/config/eslint`) covers the whole repo; `pnpm lint` runs it once from the root, packages need no lint script. `eslint-plugin-react-hooks` (recommended: Rules of Hooks, exhaustive deps, React Compiler rules) applies to `apps/web`, `apps/mobile`, `packages/ui` and `packages/hooks`. For `apps/api`, the parser gets `emitDecoratorMetadata` so `consistent-type-imports` never turns an injected class into `import type` (that would break Nest DI at runtime), and `no-extraneous-class` allows decorated empty classes (Nest modules). Each app/package defines its own `typecheck` script, run through Turbo.
- Install scripts: pnpm only runs them for packages listed `true` under `allowBuilds` in `pnpm-workspace.yaml`. Allow only what needs a native build (e.g. `argon2` in M2); packages with prebuilt binaries stay `false`.
- Data fetching: **TanStack Query** inside the shared hooks.
- Routing: **React Router** on web, **Expo Router** on mobile (routing stays in the apps).
  - Web (`apps/web/src/routes.tsx`): `SessionGate` holds every route until the session is known (`RestoringScreen`, or `UnreachableScreen` with retry), then `GuestOnly` (`/signin`, `/register`; signed in → back to the page asked for) and `RequireAuth` (signed out → `/signin` with `state.from`). `redirectTarget` only accepts same-app paths from that state (no open redirect). `App` takes `platform` and `router`, so tests use a memory router; `createWebPlatform()` adds Web Locks when `navigator.locks` exists.
- Testing: **Vitest** (web, shared packages; `packages/ui` runs on jsdom + `@testing-library/react` with a `react-native` → `react-native-web` alias, like web), **Jest + Supertest** (API, against **mongodb-memory-server**: Jest's `globalSetup` starts one real in-memory `mongod` per e2e run and `test/setup-env.ts` gives each test file its own randomly named database, no Docker in CI; `mongod` pinned to the Docker version under `config.mongodbMemoryServer` in `apps/api/package.json`), **jest-expo + React Native Testing Library** (mobile-only behavior). `packages/hooks` runs Vitest in Node with **MSW** (`msw/node`, `onUnhandledRequest: 'error'`, handlers per test); files that render opt into jsdom with `// @vitest-environment jsdom`.
- Local MongoDB: `docker-compose.yml` at the root (MongoDB 8.0, named volume, healthcheck, bound to `127.0.0.1` only, no auth). `pnpm db:up` (waits until healthy), then `pnpm dev`; `pnpm db:down` stops it and keeps the data.
- Env: the API reads `apps/api/.env` (git-ignored); `apps/api/.env.example` is committed and lists every variable. Add new variables to both, and to the Zod `envSchema` (`apps/api/src/config/env.schema.ts`), which `ConfigModule` validates at startup. Inject `ConfigService<Env, true>` and read with `get('X', { infer: true })` for typed values. E2E tests get a fixed env from `apps/api/test/setup-env.ts` (CI has no `.env`).
- Git: **Husky + lint-staged** at the repo root (lint/format staged files, typecheck on pre-commit). CI (`.github/workflows/ci.yml`, on push to `main`/`develop` and on PRs) runs `format:check`, `lint`, `typecheck`, `test`, the API's `test:e2e` and `build`, with Node from `.nvmrc` and pnpm from `packageManager`. CI caches the mongodb-memory-server binary (`~/.cache/mongodb-binaries`, keyed on `apps/api/package.json`). **Conventional Commits**, enforced by commitlint in a `commit-msg` hook. Optional scope from: `api`, `web`, `mobile`, `types`, `theme`, `ui`, `hooks`, `config`, `deps`, `ci`, `docs`.
- Reconnect and offline behavior on mobile: handled in M6.

## Repository layout (planned)

```
apps/
  api/       NestJS + MongoDB
  web/       Vite + React + Vitest
  mobile/    Expo (React Native)
packages/
  types/     Zod schemas + inferred TS types (API contract)
  theme/     design tokens
  ui/        shared components (React Native primitives)
  hooks/     shared hooks + typed API client (useSession, useLogin, useRoomMessages, ...)
  screens/   shared screen bodies (forms, lists, chat), navigation through callbacks
  config/    shared eslint, tsconfig, prettier
```

Expo in a pnpm monorepo needs a flat `node_modules`: `nodeLinker: hoisted` in `pnpm-workspace.yaml` (pnpm 11+ ignores pnpm settings in `.npmrc`; that file is only for registry/auth). Recent Expo SDKs configure Metro for monorepos automatically; add a `metro.config.js` only if `@callsign/*` packages fail to resolve. Vite needs an alias from `react-native` to `react-native-web`. Those settings live once in `@callsign/config/vite` (used by `apps/web` and the `packages/ui` tests): the alias, `.web.*`-first extensions, an alias of `react-native-svg` to its ES build, the same extensions for the dev dependency optimizer, and `react-native-svg` inlined in Vitest. Without them, `react-native-svg` resolves its native files and pulls in React Native's Flow source. Install Watchman (`brew install watchman`): without it Metro falls back to a Node file watcher that can miss new folders in shared packages, which shows up as "Element type is invalid … got: undefined". Restart Metro with `--clear` to recover.

## Milestones

- **M0 Tooling:** workspaces, React version pinning, strict tsconfig base, ESLint with `max-lines: 300` and a no-raw-colors rule, Prettier, Husky + lint-staged, tsup build for `packages/types`, `docker-compose.yml` for MongoDB, `CHANGELOG.md`, one passing test per app, CI.
- **M1 Theme and UI library:** tokens, primitives, then composed components. Render `Button` and one `Card` in both apps, in light and dark with fonts loaded, first to de-risk react-native-web.
- **M2 Backend core:** validated env config, Mongo connection, Helmet, rate limiting. `users` module (unique callsign index, argon2) and `auth` module (register, login, refresh, logout, JWT guard).
- **M3 Rooms:** `rooms` and `memberships` modules: create, list (paginated), join, leave. Unique room name. When the last member leaves, the room is kept and stays listed under "Open to join" with 0 members (history is kept too).
- **M4 Messages and realtime:** `messages` module and Socket.IO gateway. Authenticate the socket handshake with the JWT, and keep socket rooms in sync with membership. Cursor-based pagination for history. On socket reconnect, the client invalidates the open chat's messages query (Socket.IO does not replay missed events).
- **M5 Frontend integration:** typed API client, auth flow, nets list, chat screen (web first, then mobile).
- **M6 Polish:** error and empty states, reconnect handling, accessibility pass, README.

## Data models

- **User (`users`):** `callsign` (unique), `passwordHash` (argon2, never returned, `select: false`), timestamps. Identity only: sessions live in `sessions`. The callsign is both the username and the display name: 3 to 20 characters, no other format rule.
- **Session (`sessions`):** one row per logged-in device: `userId`, `tokenHash` (SHA-256 of the current refresh token), `previousTokenHash` (for reuse detection), `rotatedAt` (when it was rotated away), `expiresAt` (sliding: every refresh moves it forward), `client` (`web` | `mobile`), timestamps. Login on one device never logs out another. Within `REFRESH_REUSE_GRACE_SECONDS` (default 10, `0` = off) of a rotation the previous token still refreshes (a lost response, or two tabs at once); the window is not extended by retries. Later, presenting a rotated-away token revokes that session (it was probably stolen).
- **Case:** callsigns and net names are trimmed and lowercased by the shared Zod schema, so they are stored lowercase and uniqueness is case-insensitive (`WOLF-2` = `wolf-2`). The UI uppercases them for display.
- **Room (`rooms`):** `name` (unique, 3 to 30 chars), `createdBy`, `memberCount`, `lastMessage: { messageId, content, senderId, createdAt }`, timestamps.
  - `memberCount` is denormalized: `$inc` +1 on join, -1 on leave, only when the membership insert/delete actually succeeds (`MembershipsService.add`/`remove` return whether a row changed). Two writes, no transaction (needs a replica set): a crash between them leaves the count off by one, which is accepted; access checks always use `memberships`. Creating a net inserts it with 0 members and reuses `join()` for the creator.
  - `lastMessage` is a denormalized preview (`content` cut to 80 code points, `…` when cut, by `toMessagePreview` in `packages/types`, shared with the apps' live updates), set by `RoomsService.recordLastMessage` right after a message is saved. One atomic `updateOne` that only matches when the stored `messageId` is older (or there is none), so out-of-order sends keep the newest preview. Best effort: a failed write is logged, the send still succeeds. Drives the nets list.
- **Membership (`memberships`):** `userId`, `roomId`, `joinedAt`. Join collection between users and rooms (no members array on the room). No presence/online status in the DB; if presence is ever added, track it in memory from Socket.IO connect/disconnect.
- **Message (`messages`):** `roomId`, `senderId`, `senderCallsign` (copied at send time; callsigns never change), `content` (1 to 1000 chars), `clientMessageId` (optional UUID from the client, the idempotency key of a send), `createdAt`. History is readable by members only. A `message:send` whose key is already saved (same sender, same net) is acked with the saved message and not broadcast again; the saved content wins.

**Indexes:**

| Collection  | Index                                                                                | Serves                                                                                                |
| ----------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| users       | `{ callsign: 1 }` unique                                                             | login, register                                                                                       |
| sessions    | `{ tokenHash: 1 }` unique                                                            | refresh, logout (lookup by token hash)                                                                |
| sessions    | `{ userId: 1 }`                                                                      | a user's devices ("log out everywhere" later)                                                         |
| sessions    | `{ expiresAt: 1 }` TTL (`expireAfterSeconds: 0`)                                     | MongoDB deletes expired sessions itself (about once a minute, so queries still filter on `expiresAt`) |
| sessions    | `{ previousTokenHash: 1 }` partial (`$type: 'string'`)                               | reuse detection                                                                                       |
| rooms       | `{ name: 1 }` unique                                                                 | create net (duplicate check)                                                                          |
| memberships | `{ userId: 1, roomId: 1 }` unique                                                    | "my nets" (covered query), prevents double join                                                       |
| memberships | `{ roomId: 1 }`                                                                      | members of a net, socket room sync                                                                    |
| messages    | `{ roomId: 1, _id: -1 }`                                                             | paginated history (cursor on `_id`: unique and time-ordered, no ties)                                 |
| messages    | `{ senderId: 1, roomId: 1, clientMessageId: 1 }` unique, partial (`$type: 'string'`) | idempotent sends: a retry (or racing retries) inserts no second copy                                  |

Nets list: joined = the user's memberships → rooms by id; open = rooms whose `_id` is not in that set. Both sorted by name, cursor = last name on the page. `isMember` follows from the scope. Query plans (checked with `explain` on 5,000 rooms): joined uses the `_id` index and sorts the user's few rooms in memory; open walks the `name` index from the cursor and stops after `limit + 1` matches. MongoDB's planner picks both without a `hint`.

**API contract:** REST endpoints, DTOs, error codes and Socket.IO events are in `docs/api-contract.md`.

## Shared types

Define shapes once in `packages/types` as Zod schemas and infer the TS types. The API validates requests with the same schemas, and both apps use them for forms and response parsing. Zod describes the API contract, not the database: Mongoose schemas stay in `apps/api`, and a mapper converts a Mongoose document to the shared type (separate `MessageDto` from the document type).

## Backend practices to follow

- Hash passphrases with argon2id through `PasswordHasher` (`src/auth/`): OWASP parameters (19 MiB, t=2, p=1; the library default of 64 MiB per hash is heavy for concurrent logins). Login with an unknown callsign still verifies against a dummy hash, so timing never reveals which callsigns exist. Never return `passwordHash`; use DTOs or serializers.
- Tokens:
  - Access token: JWT, ~15 min (`JWT_ACCESS_TTL_SECONDS`), HS256 pinned on sign and verify (`src/auth/jwt-options.ts`), claims `{ sub: userId, callsign }` validated with Zod after verifying.
  - Refresh token: an opaque random string (`crypto.randomBytes(32)`), not a JWT. Stored as a SHA-256 hash (high-entropy tokens don't need argon2). Rotated on every refresh, one session per device (`src/sessions/`), with a short reuse grace window (`TokensService.refreshReuseGraceMs()` → `SessionsService.rotate(hash, next, graceMs)`).
  - Authenticate the WebSocket handshake with the access token too.
- Token storage:
  - Access token: in memory only, on both platforms.
  - Web refresh token: httpOnly cookie set by the API (`sameSite=strict`, `path=/api/auth`, `secure` from env config: on in production, optional on localhost because Safari drops `secure` cookies on `http://localhost`). Never readable from JS, never in `localStorage`. On page load the app calls `/auth/refresh` to get a new access token.
  - `sameSite=strict` needs web and API on the same site: Vite dev proxy (`/api` → API) locally, one domain when deployed.
  - Mobile refresh token: `expo-secure-store`, sent in the request body.
  - In the API, `AuthService` is transport-agnostic; `RefreshTokenTransport` (`src/auth/`) owns the web/mobile difference (set, read and clear the cookie, or put the token in the body), chosen by the `@Client()` param decorator (`X-Client`, default `web`). Clearing a cookie needs the same `path` it was set with.
  - `/auth/login`, `/auth/refresh` and `/auth/logout` accept the refresh token from the cookie (web) or the body (mobile). `/auth/logout` needs no access token. CORS allows credentials from the web origin.
  - The shared hooks stay platform-agnostic: the injected token storage provider handles the difference.
  - The API client runs at most one refresh at a time; concurrent 401s wait for the same refresh promise (otherwise rotation logs the user out).
- Take `senderId` from the token, never from the client.
- Paginate every list endpoint. Cap message length.
- Add indexes for the query patterns above.
- Validate env config at startup. Use Helmet and rate limiting.

## Design: modern field-radio style, light and dark

A clean, modern UI with a field-radio voice. The radio feel comes from typography, the olive/brass palette and the copy tone. Rounded corners and soft shadows are fine, but no gradients and no textures. No `.native` / `.web` component splits.

**Mockups** (`docs/design/`, each in `-light` and `-dark`): `signin`, `register`, `chats` (nets list), `chat`. They also show features planned for later versions; build only what is in **Scope (v1)**. Out of scope in the mockups: the role selector, full name and home field, the frequency display and tuner ticks, the "LIVE" indicator, the priority picker and priority badge, signal strength, read receipts ("ROGER"), unread counts, the alert net, the bottom tab bar (Direct/Me), the "carrier online / 17 stations" footer and the compass rose background (nice-to-have for M6).

**Theming:**

- Two schemes with the same shape: `light` and `dark`, typed by one `ThemeColors` type so they can't drift apart.
- The scheme follows the system through `useColorScheme()` (react-native-web supports it via `matchMedia`). `ThemeProvider` takes an optional `scheme` override so a manual toggle can be added later.
- `packages/theme` is plain TypeScript with no React and is the **source of truth for every value** (colors, fonts, font sizes, letter-spacing, spacing, radii, sizes). Values are not repeated here; read them from the package. Raw hex/rgba values live only in `colors.light.ts` and `colors.dark.ts`. `docs/design/callsign-palette.md` maps the files, lists the deviations from the design canvas and keeps the values of the later-version tokens. A theme test checks text contrast (4.5:1) and status dots (3:1) in both schemes.
- `packages/ui` owns `ThemeProvider`, `useTheme` and a `createStyles((theme) => ...)` helper. Components reference token names, never raw values.

**Color tokens** (semantic, same keys in both schemes; dark = olive-charcoal + brass, light = cool white-gray + olive drab):

- v1 uses: `background`, `surface` (cards, list rows, inputs, incoming bubbles), `surfaceInset` (composer field), `sheet` (composer bar), `text`, `textMuted` (secondary text, meta, placeholders), `label` (field labels, sender callsign), `primary` / `onPrimary` (primary button, TX, links), `primaryHalo` (ring around primary buttons), `bubbleOut` / `bubbleOutText` / `bubbleOutMeta` (own messages), `lampOn` / `lampOff` (status dot), `danger` / `onDanger` / `dangerText` / `dangerSoft` (errors, destructive actions), `shadow`.
- Later versions only, not added to the package in v1: `display`, `displayText`, `displayMuted`, `frequency`, `tick`, `needle` (frequency display), `badge` / `onBadge` (unread counts).
- Brass appears only in dark, olive drab only in light; both live in `primary`. Red only for errors and destructive actions in v1.

- **Shape:** named radii per use (`input`, `card`, `button`, `bubble` with a smaller `tail` corner, `sheet` for the composer's top corners, `pill`), round send button. Soft shadows from the `shadow` token through the `boxShadow` style prop (supported by RN 0.86 and react-native-web 0.21). No glows in v1.
- **Spacing:** screen gutter 20 (`spacing.xl`), minimum touch target 44 (`sizes.touch`).
- **Fonts (three):** **Stardos Stencil** (400/700) for headings, short labels and buttons; **Special Elite** (typewriter) for message text and inputs; **Share Tech Mono** for numbers and small tracked meta text (times, counts, subtitles, links). Loaded from `@expo-google-fonts/*` on both platforms: `useFonts` in the root layout on mobile (`apps/mobile/src/fonts.ts`, splash screen held until loaded), the `FontFace` API on web (`apps/web/src/fonts.ts`, `.ttf?url` imports). Custom fonts on native ignore `fontWeight`, so there is **one family token per face**, named after the Expo keys (e.g. `StardosStencil_700Bold`), and web registers the same names. Both font maps are typed by `fontFamilies`, so one `fontFamily` token works everywhere and a missing face is a type error.
- **Labels and meta:** UPPERCASE, letter-spaced (2 to 4px).
- **Icons and logo:** `react-native-svg` (works on web through react-native-web) with a few hand-made icons: chevron-left, arrow-right, plus, and the radio logo. No icon font.
- **Timestamps:** Zulu style, e.g. `22:14Z`.
- **Copy tone:** "Report in", "New station? Register here", "Request clearance", "Already on the net? Report in", "Type message. Over.", "Keep the net clear. Be brief. Be kind. Over.".
- **Accessibility:** touch targets at least 44px, real labels on inputs, `aria-label` / `accessibilityLabel` on icon-only buttons (required by the prop type), text contrast at least 4.5:1 in both schemes (checked by a theme test).

**Planned components** (primitives first, then compose; each in its own folder with `X.tsx`, `X.styles.ts`, `X.types.ts`, `X.test.tsx`):

- Primitives:
  - `Text` with variants `display`, `title`, `label`, `body`, `meta` and a `tone`.
  - `Button` with variants `primary` (primary fill), `secondary` (outline) and `link` (underlined meta), plus optional trailing icon, `disabled` and `loading`.
  - `IconButton` (square surface button, e.g. back).
  - `Input` with label, error and a `variant`: `form` (surface field) and `chat` (pill on `surfaceInset`). One component, not two.
  - `Card`, `StatusDot` (`on` / `off`), `Icon`.
- Composed:
  - `Masthead`: logo + display title + tracked subtitle (sign in, register).
  - `ScreenHeader`: optional back `IconButton`, meta line above the title ("NET · TOWER AND GROUND"), title, meta line below ("4 STATIONS ON NET"), optional action on the right (e.g. "Leave"). Title truncates in the chat header; net names in lists wrap.
  - `RoomListItem`: status dot, name, last-message preview, trailing slot (member count or Join button), `selected` state for the web sidebar.
  - `ChatBubble`: incoming on surface with the sender callsign in `label` color, outgoing on `bubbleOut`; meta line with the Zulu time.
  - `MessageInput`: chat `Input` + round send `IconButton` ("TX", with `accessibilityLabel="Send"`).
  - `SectionLabel`: tracked label for list sections ("JOINED", "OPEN TO JOIN").
- All of them are built (M1). `@callsign/ui/preview` exports `ComponentPreview`, one scrolling screen with every component, kept as a visual reference; web renders the real screens since M5 step 3, mobile until step 7. Screens own the safe-area insets (`react-native-safe-area-context`), so components never pad for the notch or home indicator.

**Screens:**

- Sign in (`signin`): `Masthead` "CALLSIGN"; callsign + passphrase; "Report in" primary button; "New station? Register here" link.
- Register (`register`): back button, `Masthead` "REGISTER"; callsign (3 to 20 characters), passphrase (at least 8 characters), confirm passphrase (not in the mockup, kept from the spec); "Request clearance" button; "Already on the net? Report in" link.
- Nets list (`chats`): header with the user's callsign above the title; joined nets (green dot, name, member count, last message), then open nets with a Join button. "+ New net" and Log out. No mockup for the open-nets section; reuse `RoomListItem`.
- Chat (`chat`): `ScreenHeader` with back, net name, member count and "Leave"; own vs other messages; `MessageInput`. Typing line only if the optional indicator is built.
- New net (no mockup): name field only (3 to 30 characters), note that the net is open to all. Built from `ScreenHeader`, `Input`, `Button`.
- Web chat (no mockup): sidebar with nets next to the chat panel; stacks on narrow widths. Same components as mobile, only the layout differs.
