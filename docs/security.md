# Security

How Callsign handles the risks in the **[OWASP Top 10:2025](https://top10.owasp.org/2025)** (web and API) and the **[OWASP Mobile Top 10 2024](https://owasp.github.io/www-project-mobile-top-10/2023-risks)** (iOS and Android).

Web and mobile share the hooks, screens and API client, so most rows cover both apps. Where a platform differs, the row says so.

**Status:** **Done** is in place and tested. **Open** is a known gap, planned on the `feat-OWASP-top-10` branch. **Accepted** is a deliberate v1 trade-off, with the reason.

## At a glance

| Risk                                       | Status   | Open items                                |
| ------------------------------------------ | -------- | ----------------------------------------- |
| A01 Broken Access Control                  | Done     | n/a                                       |
| A02 Security Misconfiguration / M8         | Done     | n/a                                       |
| A03 Software Supply Chain Failures / M2    | Done     | n/a                                       |
| A04 Cryptographic Failures / M10           | Done     | n/a                                       |
| A05 Injection / M4                         | Done     | n/a                                       |
| A06 Insecure Design                        | Done     | n/a                                       |
| A07 Authentication Failures / M1, M3       | Done     | n/a                                       |
| A08 Software or Data Integrity Failures    | Done     | n/a                                       |
| A09 Security Logging and Alerting Failures | Partly   | Alert rules (log platform, at deployment) |
| A10 Mishandling of Exceptional Conditions  | Done     | n/a                                       |
| M5 Insecure Communication                  | Done     | n/a                                       |
| M6 Inadequate Privacy Controls             | Open     | Account deletion (separate PR)            |
| M7 Insufficient Binary Protections         | Accepted | n/a                                       |
| M9 Insecure Data Storage                   | Done     | n/a                                       |

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
- **Done:** ending a session closes that device's open sockets. The handshake checks the access token only once, so without this a connected socket would keep receiving messages after logout, or after a stolen refresh token was caught. The access token carries the session id (`sid`), every socket joins a `session:<id>` room, and `RealtimeService.endSession` closes that room's sockets on logout and when refresh token reuse revokes a session, including a socket opened with a stolen access token. Other devices of the same user stay connected. The client then refreshes: a valid session reconnects, an ended one signs out.
- **Accepted (v1):** a socket is not closed when its access token expires while the session stays valid. Every early end of a session (logout, theft detection) already closes it, and closing every socket every 15 minutes would make each device reconnect and refetch its open screens.
- **Accepted (v1):** throttling is per IP, so credential stuffing spread over many IPs is not slowed per account. Failed logins are logged per callsign (A09), so an alert can catch it. A per-callsign backoff would need shared state (Redis) once there is more than one instance.

### A08 Software or Data Integrity Failures

- **Done:** no code is loaded at runtime from outside the app bundle; no OTA updates in v1.
- **Done:** tokens and request bodies are never deserialised into objects without schema validation.

### A09 Security Logging and Alerting Failures

- **Done:** a security audit trail. `SecurityLog` (`apps/api/src/common/security/`) writes one structured entry per event under the `Security` context. The event type is a closed union, so an entry cannot carry a passphrase, token or hash; a test checks that the passphrase never appears.

  | Event                 | Level | Fields                                                                 |
  | --------------------- | ----- | ---------------------------------------------------------------------- |
  | `login_failed`        | warn  | callsign, reason (`unknown_callsign` / `wrong_passphrase`), ip, client |
  | `login_succeeded`     | log   | userId, callsign, ip, client                                           |
  | `rate_limited`        | warn  | method, route pattern (no ids or query strings), ip                    |
  | `refresh_token_reuse` | warn  | sessionId, userId                                                      |

  The failure reason is logged server-side only: the API answers the same for both, so it cannot be used to enumerate callsigns, but the log tells account scanning (many unknown callsigns) from a targeted attack (many wrong passphrases on one callsign). Successes are logged too, because a success after a run of failures is the sign that an account was cracked.

- **Done:** in production the API logs JSON lines (`ConsoleLogger` with `json: true`, `main.ts`), which log tooling reads without parsing rules. JSON escapes every value, so a crafted callsign cannot forge a log line (log injection).
- **Done:** every unexpected (5xx) error is logged with its stack, from HTTP, socket handshakes and socket acks alike (`to-logged-api-error.ts`).
- **Done (clients):** unexpected errors go to the platform's `reportError` hook (`ApiPlatform`), ready for a crash reporter.
- **Open (deployment):** alerting lives in the log platform (for example New Relic or CloudWatch), not in the code. Rules to add there: many `login_failed` from one IP or for one callsign within a minute, any `refresh_token_reuse`, and `rate_limited` spikes.
- **Privacy:** these entries hold IP addresses and callsigns, which are personal data under the GDPR. Keep them only as long as security needs (for example 30 days, set on the log platform). Behind a reverse proxy the IP is the proxy's until `trust proxy` is set (`configure-app.ts`).

### A10 Mishandling of Exceptional Conditions

- **Done:** services throw `ApiException(status, code, message)`; one global filter turns every error into the same JSON shape, without stack traces or internals.
- **Done:** socket handlers acknowledge with an error and never throw, so a bad payload cannot crash a connection.
- **Done (clients):** expected API errors show inline with a retry; anything else reaches the nearest `ScreenErrorBoundary`.

## Mobile only (OWASP Mobile Top 10 2024)

Risks shared with the web are covered above: M1 and M3 under A07, M2 under A03, M4 under A05, M8 under A02, M10 under A04.

### M5 Insecure Communication

- **Done:** WebSocket transport only on mobile, through the same API URL.
- **Done:** release builds refuse to start unless `EXPO_PUBLIC_API_URL` is `https://` (`assertSecureApiUrl` in `apps/mobile/src/platform.ts`), so tokens and messages never cross the network in plain text. Development builds may use `http://` for the simulator, the emulator and the LAN.
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
- **Done:** the iOS keychain item is `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. It is never included in iCloud or iTunes backups and never moved to another device, and it stays readable while the phone is locked after the first unlock, so a background token refresh still works. A write deletes the item and adds it again, because on iOS updating an existing item keeps its old accessibility; tokens saved before this change move over on the next refresh. On Android the Keystore key never leaves the device, and the `expo-secure-store` config plugin keeps the store out of Auto Backup.
- **Done (offline-first):** offline data on mobile (the saved query cache, unsent messages) is encrypted with AES-256-GCM before it reaches AsyncStorage, which is plain on disk and can be in a backup. The 256-bit key is random bytes from the OS (`expo-crypto`), kept in the keychain / keystore with the same device-only options as the refresh token, never next to the data. GCM authenticates: a changed value, or a value moved under another key, fails to decrypt and is dropped (the app refetches it). A backup restored without the keychain therefore holds nothing readable. The cipher is `@noble/ciphers` (audited, pure JavaScript) so the app still runs in Expo Go; a dev build could move to MMKV's native encryption behind the same `OfflineStorage` interface.
- **Done:** the offline storage is wiped on every sign-in and sign-out, and when a restore finds the session over. On mobile the wipe also deletes the key, so a value written during the wipe can never be read.
- **Accepted (web):** offline data in IndexedDB is not encrypted. A browser has no key store that the page's own scripts cannot read, so a key would sit next to the data and only protect against someone copying the profile folder, who could copy the key too. The data is the user's own nets and recent messages, wiped on sign-out; on a shared computer, signing out removes it.
