# M2: backend core, users and auth (0.3.0, 0.3.1)

## Decisions

1. **No Passport.** For one JWT strategy, `@nestjs/jwt` plus our own `JwtAuthGuard` (~30 lines) is easier to read and test.
2. **Guarded by default.** `JwtAuthGuard` is an `APP_GUARD` for the whole app; only routes marked `@Public()` skip it. A route someone forgets to mark ends up locked rather than open.
3. **Own `ZodValidationPipe`** (~20 lines) instead of `nestjs-zod`, which avoids depending on its Nest 12 / Zod 4 support.
4. **An index on the refresh-token hash**, because a refresh request carries only the opaque token.

## Steps (one commit each, branch `feat/m2-backend-core`)

0. **Template cleanup:** remove the Nest scaffold leftovers; `GET /api/health` as `@Public()`.
1. **Shared auth contract** in `packages/types`: passphrase schema, register/login/refresh requests, `UserDto`, `AuthResponse`, `ErrorCode` enum and `ApiError`.
2. **Validated env config:** `@nestjs/config` with a Zod `envSchema`, so the app crashes at startup on a missing variable instead of at the first request; a typed `ConfigService`.
3. **Mongo connection:** `MongooseModule.forRootAsync`, mongodb-memory-server for tests (binary cached in CI), the health check reports DB state.
4. **HTTP plumbing in one `configureApp(app)`**, shared by `main.ts` and the e2e tests so they test the app that ships: global prefix, Helmet, cookie-parser, CORS with credentials, an exception filter mapping everything to `{ statusCode, code, message }` (no stack traces), `@nestjs/throttler` (100/min globally, 10/min on auth).
5. **`users` module:** unique callsign index; `passwordHash` with `select: false`; `toUserDto` mapper. Duplicate callsigns are handled by insert-then-catch on Mongo error `11000` (a check-then-insert races).
6. **Password hashing:** argon2id behind a `PasswordHasher`. An unknown callsign still runs `verify` against a dummy hash, so response times don't reveal which callsigns exist.
7. **Tokens and the guard:** HS256 access JWT, `randomBytes(32)` refresh token stored as SHA-256, `@Public()` and `@CurrentUser()`.
8. **`auth` controller:** register, login, refresh with rotation as one atomic `findOneAndUpdate` (two racing refreshes can't both win), logout (idempotent, no access token needed), me. The `X-Client` header picks the cookie (web) or the body (mobile).
9. **Tests, docs, release:** unit tests per service; e2e flows register → me → login → refresh → old token fails → logout, plus 409, 400, 429 and the cookie flags.

## Follow-up: sessions per device (0.3.1)

The M2 model kept one refresh token per user, so logging in on the phone ended the web session. A separate PR moved tokens into a **sessions collection**: one session per device, a sliding expiry with a TTL index, and refresh-token reuse detection that revokes only that device's session.

## Outcome

Released as `v0.3.0` (PR #3) and `v0.3.1` (PR #4).
