# M0: tooling (0.1.0)

## Spec review before any code

The first session started from my brief ([CLAUDE.md](../../../CLAUDE.md)), the mockups and a first API contract. I asked the AI to review the plan before starting. It found three gaps that would break M0 or M2:

1. **NestJS can't run TypeScript source from `packages/types`.** Vite and Metro compile workspace TS, but Nest runs compiled JS on plain Node. → Build `packages/types` with **tsup** (ESM + CJS); keep `theme`, `ui`, `hooks` source-only. Turbo tasks depend on `^build`.
2. **One React version across the monorepo.** Hoisted `node_modules` with a different React in `apps/web` gives two Reacts and "Invalid hook call" in the shared packages. → Pin `react`, `react-dom`, `react-native-web` to the Expo SDK's versions in a **pnpm `catalog:`**, before installing anything.
3. **Where API tests get a database.** → **mongodb-memory-server** in tests (no Docker in CI) and a `docker-compose.yml` MongoDB for local dev.

Plus auth details to get right later (these went into the contract): an opaque random refresh token stored as a SHA-256 hash (argon2 only for passphrases), single-flight refresh in the client, logout without an access token, a `sameSite=strict` cookie with a Vite dev proxy, a `ZodValidationPipe` instead of `class-validator`, and refetching the open chat on socket reconnect.

## Decisions made in planning

| Topic             | Choice                                                                                                                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo          | pnpm workspaces + Turborepo, hoisted `node_modules`                                                                                                                                                                      |
| Data fetching     | TanStack Query                                                                                                                                                                                                           |
| Routing           | React Router (web), Expo Router (mobile)                                                                                                                                                                                 |
| Web refresh token | **httpOnly cookie**, not `localStorage` (the AI's recommendation: an XSS bug or a compromised package can read `localStorage`). Access token in memory on both platforms, refresh token in `expo-secure-store` on mobile |
| Contract          | REST for everything except sending messages; send and live messages over Socket.IO; the server moves sockets between rooms on REST join/leave (one source of truth)                                                      |
| Message cursor    | `_id` instead of `createdAt` (unique and time-ordered, no ties)                                                                                                                                                          |
| Message sender    | `senderCallsign` stored on each message, so history pages need no user lookup                                                                                                                                            |
| Git hooks         | Husky + lint-staged in the repo root, typecheck through Turbo; Conventional Commits with commitlint                                                                                                                      |

## Steps (one commit each)

1. pnpm workspaces and Turborepo root
2. Project brief, design mockups and API contract
3. ESLint (strict, `max-lines: 300`, no `any`, no raw colors), Prettier, strict tsconfig base, Husky + lint-staged
4. Commitlint
5. Expo app with Expo Router, jest-expo and a smoke test
6. React hooks lint rules, React pinned in the catalog
7. Vite app with the react-native-web alias, dev proxy and Vitest
8. NestJS app with the `/api` prefix, Jest unit and e2e tests
9. `packages/types` built with tsup, first schema (callsign)
10. docker-compose MongoDB and `.env.example`
11. GitHub Actions CI
12. README

## Outcome

Released as `v0.1.0` (PR #1). One fix landed during the milestone: pnpm 12 ignores `nodeLinker` in `.npmrc`, so it moved to `pnpm-workspace.yaml`.
