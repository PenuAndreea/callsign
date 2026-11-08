# Security

How Callsign handles the risks in the **[OWASP Top 10:2025](https://top10.owasp.org/2025)** (web and API) and the **[OWASP Mobile Top 10 2024](https://owasp.github.io/www-project-mobile-top-10/2023-risks)** (iOS and Android).

Web and mobile share the hooks, screens and API client, so most rows cover both apps. Where a platform differs, the row says so.

**Status:** **Done** is in place and tested. **Open** is a known gap, planned on the `feat-OWASP-top-10` branch. **Accepted** is a deliberate v1 trade-off, with the reason.

## At a glance

| Risk                                       | Status   | Open items                                        |
| ------------------------------------------ | -------- | ------------------------------------------------- |
| A01 Broken Access Control                  | Done     | n/a                                               |
| A02 Security Misconfiguration / M8         | Done     | n/a                                               |
| A03 Software Supply Chain Failures / M2    | Done     | n/a                                               |
| A04 Cryptographic Failures / M10           | Done     | n/a                                               |
| A05 Injection / M4                         | Done     | n/a                                               |
| A06 Insecure Design                        | Done     | n/a                                               |
| A07 Authentication Failures / M1, M3       | Partly   | Close open sockets on logout; per-account backoff |
| A08 Software or Data Integrity Failures    | Done     | n/a                                               |
| A09 Security Logging and Alerting Failures | Partly   | Log failed logins                                 |
| A10 Mishandling of Exceptional Conditions  | Done     | n/a                                               |
| M5 Insecure Communication                  | Partly   | Require `https` in mobile release builds          |
| M6 Inadequate Privacy Controls             | Open     | Account deletion (separate PR)                    |
| M7 Insufficient Binary Protections         | Accepted | n/a                                               |
| M9 Insecure Data Storage                   | Partly   | Device-only keychain access                       |

## Web and API (OWASP Top 10:2025)

### A01 Broken Access Control

- **Done:** every route needs an access token by default (`JwtAuthGuard` as `APP_GUARD`); public routes opt out with `@Public()` (`apps/api/src/auth/`).
- **Done:** reading and sending messages checks net membership first (`assertMember` in `apps/api/src/messages/messages.service.ts`), over REST and sockets.
- **Done:** `senderId` comes from the token, never from the request body.
- **Done:** a socket only joins the rooms of nets its user belongs to (`joinRoomsOnConnect` in `apps/api/src/realtime/handshake.ts`), and only `RealtimeService` moves sockets between rooms.
- **Done:** CORS allows only `WEB_ORIGIN`, for REST and Socket.IO (`configure-app.ts`, `cors-io.adapter.ts`).

### A02 Security Misconfiguration (mobile: M8)

- **Done:** Helmet security headers on the API (nosniff, HSTS, frame denial).
- **Done:** environment validated with Zod at startup; the API refuses to start with a missing or weak value (`apps/api/src/config/env.schema.ts`). `COOKIE_SECURE` defaults to `true`.
- **Done:** Socket.IO does not serve its client bundle (`serveClient: false`) and caps payloads at 16 KB (default is 1 MB).
- **Done:** CI runs an [OWASP ZAP](https://www.zaproxy.org) baseline scan (job `zap` in `.github/workflows/ci.yml`) against the production web build and the API behind it. Any alert not reviewed and marked `IGNORE` in `.zap/rules.tsv` fails the job; each ignored rule has its reason in that file. The scan is passive: it checks headers, cookies and information leaks, but does not sign in or attack, so it does not test access control or injection, and it does not cover the mobile apps.
- **Done:** the web app sends its own security headers, defined once in `apps/web/src/securityHeaders.ts` and served by `vite preview` (the build CI scans). Before this, ZAP flagged five missing headers on every page; it now reports none.
  - **Content-Security-Policy:** every source is `'self'`, because the app loads nothing from another origin (bundle, CSS, fonts and favicon are self-hosted). No `unsafe-eval` and no `unsafe-inline`. `connect-src 'self'` covers `/api` and the Socket.IO WebSocket. `frame-ancestors 'none'` and `object-src 'none'`.
  - **Styles:** react-native-web inserts an empty `<style>` element and fills it through `insertRule`. The policy allows only the hash of the empty string, so no other inline `<style>` can run. A unit test checks the hash.
  - **Other headers:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, a `Permissions-Policy` that switches off camera, microphone, geolocation, payment and USB, and the cross-origin isolation headers (COOP, CORP and COEP `require-corp`).
  - **Dev server:** not covered. React Refresh injects an inline script that this policy would block.
- **Note for deployment:** the production host (nginx, a CDN or similar) must send the headers from `securityHeaders.ts`, plus HSTS, which only makes sense over TLS.
- **Note for deployment:** behind a reverse proxy, set `trust proxy`, or every client shares the proxy's IP for rate limiting (comment in `configure-app.ts`).

### A03 Software Supply Chain Failures (mobile: M2)

- **Done:** one lockfile, installed with `--frozen-lockfile` in CI; React, react-native-web and Zod versions pinned once in the pnpm `catalog:`.
- **Done:** CI fails on any high or critical advisory in runtime dependencies (`pnpm run audit`, which is `pnpm audit --prod --audit-level=high`). Fixes for transitive dependencies are pinned as same-major `overrides` in `pnpm-workspace.yaml`.
- **Accepted:** two advisories with no same-major fix, listed in `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` with their reasons: zod 3 inside `@expo/cli` (build tooling, never shipped) and `decode-uri-component` in expo-router (parses the app's own deep links). Revisit both with the next Expo SDK upgrade.
- **Done:** Dependabot (`.github/dependabot.yml`) opens weekly update PRs for npm packages and GitHub Actions. Packages tied to the Expo SDK are left out, because they move only with an SDK upgrade.
- **Done:** every GitHub Action is pinned to a commit SHA, not a tag, because a tag can be moved to different code. Dependabot keeps the pins current.

### A04 Cryptographic Failures (mobile: M10)

- **Done:** passphrases hashed with argon2id at OWASP's recommended parameters (19 MiB, 2 passes, 1 lane) (`password-hasher.service.ts`).
- **Done:** access tokens are HS256 JWTs with the algorithm pinned on verify, which blocks `alg: none` and algorithm confusion (`jwt-options.ts`). The secret must be at least 32 characters.
- **Done:** refresh tokens are 32 random bytes; the database stores only their SHA-256 hash (`tokens.service.ts`).
- **Done:** no custom cryptography; Node's `crypto`, argon2 and the platform keychain only.

### A05 Injection (mobile: M4)

- **Done:** every HTTP body, query and socket payload is validated with the shared Zod schemas (`ZodValidationPipe`, `parseOrThrow`). Values must be strings of the expected shape, so MongoDB operator injection (`{ "$gt": "" }`) is rejected before it reaches a query.
- **Done:** React and React Native escape rendered text; the code has no `dangerouslySetInnerHTML` or `eval`.
- **Done:** message length is capped by the schema, and the socket payload limit backs it up.

### A06 Insecure Design

- **Done:** one Zod contract in `packages/types` for the API and both apps, so validation cannot drift between client and server.
- **Done:** list endpoints are paginated (cursor-based for history), so no request can load an unbounded collection.
- **Done:** rate limiting on HTTP (100/min per IP, 10/min on auth routes) and a sliding-window limit on socket messages.
- **Done:** login answers the same way, and takes the same time, for an unknown callsign and a wrong passphrase (dummy argon2 verify), so login cannot be used to find out which callsigns exist.
- **Accepted (v1):** register answers `409 CALLSIGN_TAKEN`, which does reveal that a callsign exists. A chat app needs to tell people their name is taken; the auth rate limit slows down scanning.

### A07 Authentication Failures (mobile: M1, M3)

- **Done:** short-lived access token (15 min), kept in memory only, never in `localStorage` or on disk.
- **Done:** refresh tokens rotate on every use. Reusing an old token outside a short grace window counts as theft and revokes the whole session (`sessions.service.ts`). Sessions expire and MongoDB deletes them (TTL index).
- **Done (web):** the refresh token lives in an httpOnly, `sameSite=strict` cookie scoped to `/api/auth`. JavaScript cannot read it (XSS), and other sites cannot send it (CSRF).
- **Done:** passphrase policy of 8 to 128 characters; spaces allowed, so passphrases can be real phrases.
- **Done:** sockets authenticate in the handshake with the same token check as HTTP.
- **Open:** logout revokes the session, but a socket that is already connected keeps receiving messages until it reconnects. Plan: disconnect the user's sockets on logout.
- **Accepted (v1):** throttling is per IP, so credential stuffing spread over many IPs is not slowed per account. A per-callsign backoff would need shared state (Redis) once there is more than one instance.

### A08 Software or Data Integrity Failures

- **Done:** no code is loaded at runtime from outside the app bundle; no OTA updates in v1.
- **Done:** tokens and request bodies are never deserialised into objects without schema validation.

### A09 Security Logging and Alerting Failures

- **Done:** refresh token reuse is logged with the session and user id (`sessions.service.ts`).
- **Done:** every unexpected (5xx) error is logged with its stack, from HTTP, socket handshakes and socket acks alike (`to-logged-api-error.ts`). Passphrases and tokens are never logged.
- **Done (clients):** unexpected errors go to the platform's `reportError` hook (`ApiPlatform`), ready for a crash reporter.
- **Open:** failed logins are not logged. Plan: a structured warning with callsign and IP, so brute force shows up in the logs.

### A10 Mishandling of Exceptional Conditions

- **Done:** services throw `ApiException(status, code, message)`; one global filter turns every error into the same JSON shape, without stack traces or internals.
- **Done:** socket handlers acknowledge with an error and never throw, so a bad payload cannot crash a connection.
- **Done (clients):** expected API errors show inline with a retry; anything else reaches the nearest `ScreenErrorBoundary`.

## Mobile only (OWASP Mobile Top 10 2024)

Risks shared with the web are covered above: M1 and M3 under A07, M2 under A03, M4 under A05, M8 under A02, M10 under A04.

### M5 Insecure Communication

- **Done:** WebSocket transport only on mobile, through the same API URL.
- **Open:** the development default API URL is `http://` (simulator and emulator). Plan: release builds refuse an API URL that is not `https://`.
- **Accepted (v1):** no certificate pinning. Pinning breaks the app whenever the server certificate rotates unless pin updates are managed; worth it once there is a production backend and a rotation process.

### M6 Inadequate Privacy Controls

- **Done:** the app collects only a callsign, a passphrase hash and the messages a user sends. No email, name, location, analytics or tracking.
- **Done:** personal data is kept out of logs (ids, not message bodies).
- **Open:** no way to delete an account and its data (GDPR right to erasure). Planned as its own PR: an endpoint and a screen, deciding between deleting and anonymising the user's messages.

### M7 Insufficient Binary Protections

- **Accepted (v1):** no obfuscation or jailbreak/root detection. The bundle holds no secrets (only `EXPO_PUBLIC_API_URL`), and every check that matters is enforced by the API, so a modified app gains nothing it could not do with plain HTTP calls.

### M9 Insecure Data Storage

- **Done:** the refresh token is stored in the iOS Keychain / Android Keystore through `expo-secure-store` (`apps/mobile/src/platform.ts`), never in AsyncStorage.
- **Done:** sign-out and sign-in clear the query cache, so the next user never sees the previous user's data (`sessionStore.ts`).
- **Open:** the keychain item uses the default accessibility. Plan: `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, so the token is never included in backups or moved to another device.
- **Planned with offline-first:** once the query cache is saved to disk, messages are stored on the device. That storage must be encrypted (key in the secure store) and wiped on sign-out.
