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

- Backend: **NestJS** (Express under the hood), Mongoose for MongoDB, Socket.IO gateway for WebSockets.
- Web: **Vite + React + Vitest**. No Next.js.
- Mobile: **Expo** (React Native).
- Shared UI: one component library written with React Native primitives, rendered on web through **react-native-web**.
- Shared contract: **Zod** schemas in a shared package, with TypeScript types inferred from them (`z.infer`).
- Shared hooks and the API client live in `packages/`, not in the apps (single source of truth). Platform-specific parts (token storage, API base URL) are injected through a provider, never imported directly in hooks.
- Rooms are public, there is no role field, and rooms have no frequency number.
- Monorepo: **pnpm workspaces + Turborepo** (`nodeLinker: hoisted` in `pnpm-workspace.yaml` for Expo).
- Shared package builds: `packages/types` is **built with tsup** (ESM + CJS in `dist/`) because the NestJS API runs compiled JS under plain Node and cannot import TS source. `theme`, `ui` and `hooks` stay **source-only** (consumed only by Vite and Metro). Turbo runs `^build` before `typecheck`, `test` and `dev`.
- One React version: `react`, `react-dom`, `react-test-renderer`, `react-native-web`, `@types/react` and `@types/react-dom` live in the default pnpm `catalog:` in `pnpm-workspace.yaml`, pinned to what the Expo SDK expects (React 19.2.3 for SDK 57). Apps reference them as `"catalog:"`. Bump only together with an Expo SDK upgrade.
  - Libraries must support that React version: **React Router 7** (v8 needs React ≥19.2.7), **React Native Testing Library 13** with `react-test-renderer` (v14 needs React 19.3).
  - Known harmless peer warning: `@react-native/metro-config` 0.87 vs 0.86 (optional peer of the RN CLI; Expo uses its own Metro config).
- API validation: the shared Zod schemas, through a `ZodValidationPipe` (custom or `nestjs-zod`). No `class-validator`.
- TypeScript pinned to `~6.0` (typescript-eslint supports `<6.1`; TS 7's native compiler is not yet supported by the tooling). TS 6 defaults `types` to `[]`, so every tsconfig lists its globals explicitly (e.g. `["jest"]` on mobile, `["node", "jest"]` on the API, `["vite/client"]` on web).
- Tests: in `src/__tests__/` or next to the code, but never inside Expo Router's `src/app/` (every file there becomes a route).
- Linting: one root `eslint.config.js` (re-exports `@callsign/config/eslint`) covers the whole repo; `pnpm lint` runs it once from the root, packages need no lint script. `eslint-plugin-react-hooks` (recommended: Rules of Hooks, exhaustive deps, React Compiler rules) applies to `apps/web`, `apps/mobile`, `packages/ui` and `packages/hooks`. Each app/package defines its own `typecheck` script, run through Turbo.
- Data fetching: **TanStack Query** inside the shared hooks.
- Routing: **React Router** on web, **Expo Router** on mobile (routing stays in the apps).
- Testing: **Vitest** (web, shared packages), **Jest + Supertest** (API, against **mongodb-memory-server**: a real throwaway MongoDB per test file, no Docker in CI), **jest-expo + React Native Testing Library** (mobile-only behavior).
- Local MongoDB: `docker-compose.yml` at the root (`docker compose up`, then `pnpm dev`).
- Git: **Husky + lint-staged** at the repo root (lint/format staged files, typecheck on pre-commit); CI runs the same checks. **Conventional Commits**, enforced by commitlint in a `commit-msg` hook. Optional scope from: `api`, `web`, `mobile`, `types`, `theme`, `ui`, `hooks`, `config`, `deps`, `ci`, `docs`.
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
  hooks/     shared hooks + typed API client (useAuth, useRoomMessages, ...)
  config/    shared eslint, tsconfig, prettier
```

Expo in a pnpm monorepo needs a flat `node_modules`: `nodeLinker: hoisted` in `pnpm-workspace.yaml` (pnpm 11+ ignores pnpm settings in `.npmrc`; that file is only for registry/auth). Recent Expo SDKs configure Metro for monorepos automatically; add a `metro.config.js` only if `@callsign/*` packages fail to resolve. Vite needs an alias from `react-native` to `react-native-web`.

## Milestones

- **M0 Tooling:** workspaces, React version pinning, strict tsconfig base, ESLint with `max-lines: 300` and a no-raw-colors rule, Prettier, Husky + lint-staged, tsup build for `packages/types`, `docker-compose.yml` for MongoDB, `CHANGELOG.md`, one passing test per app, CI.
- **M1 Theme and UI library:** tokens, primitives, then composed components. Render `Button` and one `Panel` in both apps first to de-risk react-native-web.
- **M2 Backend core:** validated env config, Mongo connection, Helmet, rate limiting. `users` module (unique callsign index, argon2) and `auth` module (register, login, refresh, logout, JWT guard).
- **M3 Rooms:** `rooms` and `memberships` modules: create, list (paginated), join, leave. Unique room name. When the last member leaves, the room is kept and stays listed under "Open to join" with 0 members (history is kept too).
- **M4 Messages and realtime:** `messages` module and Socket.IO gateway. Authenticate the socket handshake with the JWT, and keep socket rooms in sync with membership. Cursor-based pagination for history. On socket reconnect, the client invalidates the open chat's messages query (Socket.IO does not replay missed events).
- **M5 Frontend integration:** typed API client, auth flow, nets list, chat screen (web first, then mobile).
- **M6 Polish:** error and empty states, reconnect handling, accessibility pass, README.

## Data models

- **User (`users`):** `callsign` (unique), `passwordHash` (argon2, never returned), `refreshTokenHash` (nullable; one active session per user in v1), timestamps. The callsign is both the username and the display name: 3 to 20 characters, no other format rule.
- **Case:** callsigns and net names are trimmed and lowercased by the shared Zod schema, so they are stored lowercase and uniqueness is case-insensitive (`WOLF-2` = `wolf-2`). The UI uppercases them for display.
- **Room (`rooms`):** `name` (unique, 3 to 30 chars), `createdBy`, `memberCount`, `lastMessage: { content, senderId, createdAt }`, timestamps.
  - `memberCount` is denormalized: `$inc` +1 on join, -1 on leave, only when the membership insert/delete actually succeeds.
  - `lastMessage` is a denormalized preview (`content` cut to ~80 chars), updated by the messages service right after saving a message. Drives the nets list.
- **Membership (`memberships`):** `userId`, `roomId`, `joinedAt`. Join collection between users and rooms (no members array on the room). No presence/online status in the DB; if presence is ever added, track it in memory from Socket.IO connect/disconnect.
- **Message (`messages`):** `roomId`, `senderId`, `senderCallsign` (copied at send time; callsigns never change), `content` (1 to 1000 chars), `createdAt`. History is readable by members only.

**Indexes:**

| Collection  | Index                             | Serves                                                                |
| ----------- | --------------------------------- | --------------------------------------------------------------------- |
| users       | `{ callsign: 1 }` unique          | login, register                                                       |
| rooms       | `{ name: 1 }` unique              | create net (duplicate check)                                          |
| memberships | `{ userId: 1, roomId: 1 }` unique | "my nets", prevents double join                                       |
| memberships | `{ roomId: 1 }`                   | members of a net, socket room sync                                    |
| messages    | `{ roomId: 1, _id: -1 }`          | paginated history (cursor on `_id`: unique and time-ordered, no ties) |

Nets list: joined = the user's memberships → rooms by id; open = rooms whose `_id` is not in that set. Both sorted by name, cursor = last name on the page.

**API contract:** REST endpoints, DTOs, error codes and Socket.IO events are in `docs/api-contract.md`.

## Shared types

Define shapes once in `packages/types` as Zod schemas and infer the TS types. The API validates requests with the same schemas, and both apps use them for forms and response parsing. Zod describes the API contract, not the database: Mongoose schemas stay in `apps/api`, and a mapper converts a Mongoose document to the shared type (separate `MessageDto` from the document type).

## Backend practices to follow

- Hash passphrases with argon2 (or bcrypt). Never return `passwordHash`; use DTOs or serializers.
- Tokens:
  - Access token: JWT, ~15 min.
  - Refresh token: an opaque random string (`crypto.randomBytes(32)`), not a JWT. Stored as a SHA-256 hash (high-entropy tokens don't need argon2). Rotated on every refresh.
  - Authenticate the WebSocket handshake with the access token too.
- Token storage:
  - Access token: in memory only, on both platforms.
  - Web refresh token: httpOnly cookie set by the API (`sameSite=strict`, `path=/api/auth`, `secure` from env config: on in production, optional on localhost because Safari drops `secure` cookies on `http://localhost`). Never readable from JS, never in `localStorage`. On page load the app calls `/auth/refresh` to get a new access token.
  - `sameSite=strict` needs web and API on the same site: Vite dev proxy (`/api` → API) locally, one domain when deployed.
  - Mobile refresh token: `expo-secure-store`, sent in the request body.
  - `/auth/login`, `/auth/refresh` and `/auth/logout` accept the refresh token from the cookie (web) or the body (mobile). `/auth/logout` needs no access token. CORS allows credentials from the web origin.
  - The shared hooks stay platform-agnostic: the injected token storage provider handles the difference.
  - The API client runs at most one refresh at a time; concurrent 401s wait for the same refresh promise (otherwise rotation logs the user out).
- Take `senderId` from the token, never from the client.
- Paginate every list endpoint. Cap message length.
- Add indexes for the query patterns above.
- Validate env config at startup. Use Helmet and rate limiting.

## Design: simplified WW2 field-radio style

Flat and printed rather than machined. The WW2 feel comes from color, typography and tone, not textures. No gradients, no textures, no shadows or glows, no `.native` / `.web` component splits.

**Tokens** (in `packages/theme`, components reference names only, never raw values):

| Token          | Value     | Use                                                            |
| -------------- | --------- | -------------------------------------------------------------- |
| background     | `#3b4630` | olive drab screen background                                   |
| backgroundDark | `#2c3524` | headers, footers, sidebar                                      |
| paper          | `#e8dfc0` | cards, other users' messages, inputs                           |
| ink            | `#1f1a14` | text on paper, all borders                                     |
| inkMuted       | `#4a4234` | secondary text on paper                                        |
| brass          | `#c9a24a` | buttons, own-message border, accent bars                       |
| brown          | `#4a2f20` | own messages                                                   |
| alert          | `#9e3a26` | stamp badges (darkened from `#b5442e` to reach 4.5:1 on paper) |
| signalOn       | `#8fd14f` | active status dot                                              |
| mutedOnOlive   | `#cfc7a6` | secondary text on olive                                        |
| divider        | `#6b7a58` | dashed dividers                                                |
| placeholder    | `#655d4a` | input placeholders                                             |

- **Fonts:** Stardos Stencil (400/700) for headings and labels, Special Elite for body text. Both from Google Fonts. Two fonts only.
- **Borders:** 2px solid ink on cards and buttons, 3px brass line under headers and above footers. No border radius.
- **Labels:** UPPERCASE, letter-spaced (2 to 4px), Stardos Stencil bold.
- **Stamp badge:** bordered text in alert color, rotated 3 to 4 degrees (one `transform`).
- **Timestamps:** Zulu style, e.g. `22:14Z`.
- **Copy tone:** "Report in", "Enlist here", "Type message. Over.", "Report for duty", "Log sheet".
- **Accessibility:** touch targets at least 44px, real labels on inputs, `aria-label` on icon-only buttons, text contrast at least 4.5:1.

**Planned components** (primitives first, then compose):

- `Text`, `Button` (brass primary, outline secondary), `Panel` (paper card), `StatusDot`, `SectionDivider` (label + dashed line).
- `Input` with a `variant`: `underline` (form cards) and `boxed` (chat input). One component, not two.
- `Badge` (stamp), e.g. "FORM 1".
- `ChatBubble`: incoming paper, outgoing brown with brass border. Sender label is the callsign.
- `RoomListItem`: `selected` state (brass background, web sidebar); trailing slot holds a member count or a Join button. Web sidebar hides the member count on joined nets.
- `ScreenHeader`: optional brass back button (icon-only, needs `aria-label`), title with an optional subtitle above ("STATION WOLF-2") or below ("12 MEMBERS"), optional outline action on the right. Title truncates in the chat header; room names in lists wrap.
- `MessageInput`.

**Screens** (mockups in `docs/design/`: `login.png`, `register.png`, `nets.png`, `chat.png`, `newNet.png`, `chatWeb.png`):

- Login: callsign + passphrase on a "Report for duty" form card, "Report in" button, "Enlist here" link to register.
- Register: "Enlistment" form card with a "FORM 1A" stamp; callsign (3 to 20 characters), passphrase (at least 8 characters), confirm passphrase; "Enlist" button; "Already enlisted? Report in" link to login.
- Nets list: joined nets (green dot = joined, name, member count, last message) and open nets with a Join button. "+ New net" and Log out.
- Chat: back, "Leave" (same label on web and mobile), member count, "Log sheet <number>" divider (random decorative number, picked once when the chat screen opens; not tied to data), own vs other messages, message input + Send. Typing line only if the optional indicator is built.
- New net: name field only (3 to 30 characters), note that the net is open to all.
- Web chat: sidebar with nets next to the chat panel; stacks on narrow widths. Reuses the same components as mobile, only the layout differs.
