# Callsign

A real-time chat app with a WW2 field-radio feel. Chatrooms are called **nets** and users are identified by a **callsign**.

- **API:** NestJS + MongoDB, REST for nets and history, Socket.IO for live messages
- **Web:** Vite + React, sharing its UI with mobile through react-native-web
- **Mobile:** Expo (React Native)

## Prerequisites

- **Node.js 24.9 or newer** (`.nvmrc` pins 24; run `nvm use` if you use nvm)
- **pnpm**, enabled through Corepack (the exact version is pinned in `package.json`):
  ```bash
  corepack enable
  ```
- **Docker** for the local MongoDB (e.g. [OrbStack](https://orbstack.dev) or Docker Desktop)
- **Xcode** with an iOS Simulator and/or **Android Studio** with an emulator, to run the mobile app. Or the **Expo Go** app on a phone.

## Setup

```bash
pnpm install
```

```bash
cp apps/api/.env.example apps/api/.env
```

## Running the apps

Run each app in its own terminal, from the repo root.

### Database

```bash
pnpm db:up
```

Starts MongoDB 8 in Docker on `localhost:27017` and waits until it is healthy. Data is kept in a Docker volume. `pnpm db:down` stops it and keeps the data.

#### Viewing the data

With the database running, open a shell on the `callsign` database (the container ships `mongosh`, nothing to install):

```bash
docker compose exec mongo mongosh callsign
```

| What                          | Command                                         |
| ----------------------------- | ----------------------------------------------- |
| list the collections          | `show collections`                              |
| stations (without the hashes) | `db.users.find({}, { passwordHash: 0 })`        |
| nets                          | `db.rooms.find()`                               |
| who is in which net           | `db.memberships.find()`                         |
| the 5 newest messages         | `db.messages.find().sort({ _id: -1 }).limit(5)` |
| indexes of a collection       | `db.messages.getIndexes()`                      |

`exit` leaves the shell. For a GUI, install [MongoDB Compass](https://www.mongodb.com/products/tools/compass) (`brew install --cask mongodb-compass`) and connect to `mongodb://localhost:27017`. It also shows each collection's indexes and query plans (Explain).

### API

```bash
pnpm --filter @callsign/api dev
```

Runs on http://localhost:3000 and restarts on file changes. All routes are under `/api`, e.g. http://localhost:3000/api.

### Web

```bash
pnpm --filter @callsign/web dev
```

Runs on http://localhost:5173. Requests to `/api` and `/socket.io` are proxied to the API, so the web app and API share one origin in development.

### Mobile

```bash
pnpm --filter @callsign/mobile start
```

Starts the Expo dev server (the API must be running too). Then press:

- **`i`** to open the iOS Simulator
- **`a`** to open an Android emulator
- or scan the QR code with Expo Go on your phone (phone and computer on the same Wi-Fi)

`pnpm --filter @callsign/mobile ios` opens the iOS Simulator directly. The app needs **Expo Go for SDK 57**: if Expo Go says the project needs a newer version, press `i` (or `a`) in the Expo terminal and accept the upgrade it offers.

**Which API the app talks to.** Simulators reach the API on your computer without setup: the iOS Simulator at `http://localhost:3000`, the Android emulator at `http://10.0.2.2:3000` (the emulator's name for your computer). A real phone needs your computer's address on the network:

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Set `EXPO_PUBLIC_API_URL` in it, e.g. `http://192.168.1.20:3000` (find the address with `ipconfig getifaddr en0` on macOS), then restart the Expo server with `--clear`. The refresh token is kept in the iOS Keychain / Android Keystore (`expo-secure-store`), so the app stays signed in across restarts.

If the app shows `Element type is invalid … got: undefined` after adding files to a shared package, Metro served a stale bundle: install Watchman (`brew install watchman`) and restart with `pnpm --filter @callsign/mobile start --clear`.

### API and web together

```bash
pnpm dev
```

Starts the API, the web app and a watcher that rebuilds `@callsign/types` on change, all through Turbo in one terminal. Mobile runs separately because Expo's menu needs its own terminal.

### Trying it out

1. Start the database, the API and the web app (`pnpm db:up`, then `pnpm dev`).
2. Open http://localhost:5173, choose **New station? Register here** and register a callsign (3 to 20 characters) with a passphrase (at least 8).
3. Open a net with **New net**, or join one under **Open to join**. Messages go out with **TX** or Enter.
4. For a second station, register another callsign in a private window, another browser or the mobile app, and join the same net: messages, the member count and the net list preview update live on both.

On wide windows the nets list stays on the left of the chat; below 900 px wide, the list and the chat are separate pages, like on the phone.

### When something goes wrong

- **A request fails** (not a member, a name taken, a server error): the screen says why and offers to try again.
- **The API cannot be reached** (offline, API stopped): "No contact" copy, and messages show "Not sent" with Retry. The app reconnects by itself.
- **A screen crashes** (a bug): it shows "Signal lost" with Try again (and Back where the screen's own back button is gone). On wide web windows only the chat panel is replaced; the nets list stays.

Unexpected errors (bugs, server failures, responses that break the contract) are logged as `[callsign] unexpected … error` in the browser console or Metro's terminal. To send them to an error-tracking service instead, pass `reportError` in the app's platform (`apps/web/src/platform.ts`, `apps/mobile/src/platform.ts`). In development, React Native also shows every caught error in its red LogBox overlay; dismiss it to see the crash screen.

### Shared types

`@callsign/types` is built to `packages/types/dist`. `pnpm dev`, `pnpm test` and `pnpm typecheck` build it automatically. When you start apps one by one and change the types, rebuild them:

```bash
pnpm --filter @callsign/types build
```

## Checks

| Command                                | What it does                        |
| -------------------------------------- | ----------------------------------- |
| `pnpm lint`                            | ESLint over the whole repo          |
| `pnpm format` / `pnpm format:check`    | Prettier write / check              |
| `pnpm typecheck`                       | TypeScript in every app and package |
| `pnpm test`                            | Unit tests in every app and package |
| `pnpm --filter @callsign/api test:e2e` | API end-to-end tests                |
| `pnpm build`                           | Production builds (types, API, web) |

A pre-commit hook lints and formats staged files and runs the typecheck. Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org), e.g. `feat(api): add auth module`. CI runs all checks above on every push and pull request.

## Project structure

```
apps/
  api/       NestJS + MongoDB
  web/       Vite + React
  mobile/    Expo (React Native)
packages/
  types/     Zod schemas + TypeScript types (the API contract)
  theme/     design tokens: colors (light and dark), fonts, spacing, sizes
  ui/        components on React Native primitives (web through react-native-web)
  hooks/     API client, session, realtime socket and data hooks (TanStack Query)
  screens/   screen bodies shared by web and mobile; the apps only add routing and layout
  config/    shared ESLint, Prettier, TypeScript and Vite configs
docs/
  api-contract.md   REST endpoints and Socket.IO events
  design/           screen mockups
```

## Data model

MongoDB collections used by the API:

```mermaid
erDiagram
  USERS ||--o{ MEMBERSHIPS : joins
  ROOMS ||--o{ MEMBERSHIPS : has
  USERS ||--o{ ROOMS : creates
  ROOMS ||--o{ MESSAGES : contains
  USERS ||--o{ MESSAGES : sends
  USERS ||--o{ SESSIONS : "logs in on"

  USERS {
    ObjectId _id PK
    string callsign UK "lowercase, 3 to 20 chars"
    string passwordHash "argon2, never returned"
    Date createdAt
    Date updatedAt
  }

  SESSIONS {
    ObjectId _id PK
    ObjectId userId FK
    string tokenHash UK "SHA-256 of the refresh token"
    string previousTokenHash "reuse detection, nullable"
    Date rotatedAt "start of the reuse grace window, nullable"
    Date expiresAt "sliding, TTL-deleted"
    string client "web or mobile"
    Date createdAt
    Date updatedAt
  }

  ROOMS {
    ObjectId _id PK
    string name UK "lowercase, 3 to 30 chars"
    ObjectId createdBy FK
    number memberCount "kept in sync on join and leave"
    object lastMessage "messageId, content, senderId, createdAt"
    Date createdAt
    Date updatedAt
  }

  MEMBERSHIPS {
    ObjectId _id PK
    ObjectId userId FK
    ObjectId roomId FK
    Date joinedAt
  }

  MESSAGES {
    ObjectId _id PK
    ObjectId roomId FK
    ObjectId senderId FK
    string senderCallsign "copied at send time"
    string content "1 to 1000 chars"
    string clientMessageId "optional, idempotency key"
    Date createdAt
  }
```

- **Memberships** link users and nets, instead of a member array on each room.
- **`memberCount`** and **`lastMessage`** are copies kept on the room, so the nets list needs no extra queries.
- **`senderCallsign`** is copied onto each message, so history pages need no user lookups (callsigns never change).
- **`clientMessageId`** is a UUID the client makes per message; a retried send with the same key returns the saved message instead of a second copy.
- Online status is not stored in the database.

| Collection  | Index                                                            | Used for                                          |
| ----------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| users       | `{ callsign: 1 }` unique                                         | login, register                                   |
| sessions    | `{ tokenHash: 1 }` unique                                        | refresh, logout                                   |
| sessions    | `{ userId: 1 }`                                                  | a user's devices                                  |
| sessions    | `{ expiresAt: 1 }` TTL                                           | MongoDB deletes expired sessions                  |
| sessions    | `{ previousTokenHash: 1 }` partial                               | reuse detection, grace retry                      |
| rooms       | `{ name: 1 }` unique                                             | creating a net (duplicate check)                  |
| memberships | `{ userId: 1, roomId: 1 }` unique                                | "my nets" (covered query), prevents joining twice |
| memberships | `{ roomId: 1 }`                                                  | members of a net, socket room sync                |
| messages    | `{ roomId: 1, _id: -1 }`                                         | paginated history (cursor on `_id`)               |
| messages    | `{ senderId: 1, roomId: 1, clientMessageId: 1 }` unique, partial | idempotent sends (a retry is never saved twice)   |
