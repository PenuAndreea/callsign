# Changelog

One short line per commit, newest first. Each milestone is a release: M0 = 0.1.0, M1 = 0.2.0, and so on; 1.0.0 is the finished v1 scope.

## Unreleased

- feat(mobile): splash timeline and drivers (useSplashProgress, useContinuousRotation) on Reanimated 4; Jest setup mocks Reanimated and worklets
- feat(theme): frequency-display tokens for the splash tuner (display, displayText, displayMuted, tick, needle), with contrast tests; light needle lightened to reach 3:1
- test(screens): the failed-Leave test waits for the socket first (CI race with the reconnect reset)
- fix(ui): the composer sends the field's own text on Return, not a value one keystroke behind
- feat(screens): day separators in the chat (Today, Yesterday, 17 Oct)
- feat(ui): message times in the device's time zone, without the Z (formatTime replaces formatZulu)
- fix(screens): a failed Leave says so ("Could not leave.") and clears once back on the air
- feat(screens): join and leave errors show inline in the chat; errorMessageIfAny replaces the repeated error-or-nothing check
- feat(screens): a net that does not exist is "off the air" in the chat (no Join, Leave or composer), not a dead-end offer to join
- fix(hooks): the chat header keeps the net from the list when its own fetch fails (useNet initialData)
- fix(hooks): a reconnect also refetches nets data that failed to load (a chat that failed in an outage recovers)
- chore(docs): slim CLAUDE.md to rules, stack and conventions; architecture details move to docs/architecture.md, the design spec to docs/design/README.md
- chore(docs): error handling in CLAUDE.md (expected, reported, crashes; web and mobile boundaries) and README (when something goes wrong)
- feat(mobile): crash boundaries: one around the navigator, one per chat and on New net, with a way back
- feat(screens): crash screen offers Back where the crashed screen's header is gone (onBack); web narrow chat uses it
- feat(web): crash boundaries: one in the root route (resets on another page), one per chat panel (the nets list stays)
- test(web): shared app test helpers (appTestUtils: setupAppTests, renderApp, refreshAnswers)
- feat(screens): CrashScreen and ScreenErrorBoundary (react-error-boundary): reports render crashes, resets failed queries on Try again, resetKeys
- feat(hooks): one report per error (oncePerError), componentStack for render crashes, useQueryErrorResetBoundary re-export
- feat(hooks): live socket events are checked against the shared schema; broken acks and events are reported, invalid events dropped
- feat(hooks): queries throw bugs (non-API errors) to the nearest error boundary; API errors stay inline
- fix(hooks): a 502/503/504 without an ApiError body (proxy, API down) is NETWORK_ERROR, not INTERNAL_ERROR; a send refused by the socket rate limit says "stand by a few seconds"
- feat(hooks): reportError seam: ApiPlatform.reportError (console by default), useReportError, the query and mutation caches report unexpected errors only

## 0.6.0 (M5: frontend integration)

- test(config): screen tests wait up to 5 s for async queries (setupScreenTests, 10 s test timeout): the first App render took 2.3 s on CI
- chore(docs): README how-tos for mobile (API address per simulator, a real phone, Expo Go), trying it out, package overview
- feat(mobile): real app on Expo Router (Stack.Protected auth and app groups, splash until the session is known), secure-store refresh token, emulator API URLs, AppState focus
- feat(screens): safe-area insets and keyboard avoidance in the form, nets and chat screens; next key moves between fields; passphrases never auto-capitalized
- feat(ui): Input forwards its ref to the TextInput
- feat(hooks): socket factory options (websocket-only on React Native); focusManager re-export
- chore(config): alias react-native-safe-area-context to its ES build for Vite and Vitest

- feat(web): split layout (nets sidebar next to the chat from 900 px, stacked below) and the chat route
- feat(screens): ChatScreen (inverted history with older pages, pending and failed sends with Retry, join offer, live traffic)
- feat(hooks): useNetMessages and useSendMessage with pending sends, idempotent retry and live insert into the history
- feat(ui): delivery status on ChatBubble; sizes.sidebar and breakpoints.split tokens
- feat(hooks): realtime socket per signed-in session (token per handshake, refresh on a refused handshake, catch-up after reconnects), live preview and member count in the cache, useRealtimeStatus, Socket.IO test server

- feat(web): nets list, new net and a temporary net page with Leave (/nets/new, /nets/:netId)
- feat(screens): NetsScreen (joined and open sections, paged, join opens the net) and NewNetScreen; FormLayout, formErrorExcept, stationsLabel
- feat(ui): trailingLabel on RoomListItem, so a trailing count is part of the row's accessible name
- feat(hooks): nets hooks (useNets, useNet, useCreateNet, useJoinNet, useLeaveNet) with netKeys and net fixtures

- feat(web): routes with SessionGate, GuestOnly and RequireAuth, sign in and register through the shared screens, Web Locks platform, temporary home with log out
- feat(screens): screens package with SignInScreen, RegisterScreen, UnreachableScreen, RestoringScreen, react-hook-form helpers (useZodForm, FormInput, FormError) and error copy
- feat(hooks): @callsign/hooks/testing entry (MSW server, fixtures, test clients) shared by the packages that test against the API
- feat(ui): trailing icon on Button; sizes.form token for the auth column
- feat(types): field messages on the callsign, passphrase and net name schemas

- feat(hooks): session store (restore on start, unreachable state, sign in/out with cache clear), useSession, useLogin, useRegister, useLogout; client logout and stale-refresh guard; rename CallsignProvider → ApiProvider, CallsignPlatform → ApiPlatform
- feat(hooks): hooks package with CallsignProvider (injected platform), typed fetch client (Zod-parsed responses, ApiClientError, single-flight refresh with one retry) and query defaults
- feat(api): refresh reuse grace window (REFRESH_REUSE_GRACE_SECONDS, default 10): the previous token still refreshes right after a rotation instead of revoking the session
- refactor(types): toMessagePreview moves from the API to the shared types, for the apps' live previews
- feat(api): idempotent message:send with an optional clientMessageId (unique partial index, retry acks the saved message without a rebroadcast)

## 0.5.0 (M4: messages and realtime)

- feat(api): RealtimeService; REST join/leave moves the user's open sockets and sends room:updated with the new member count
- feat(api): message:send over the socket (validate, membership check, save, conditional lastMessage preview, ack, broadcast), 5 per 5 s per socket
- feat(api): Socket.IO gateway with JWT handshake, joins user and net rooms on connect; CORS adapter; global guards skip socket events
- chore(docs): how to view the local database (mongosh in the container, Compass) in the README
- feat(api): messages module (schema with { roomId, _id } index, mapper) and GET /rooms/:id/messages, members only, cursor on _id
- feat(types): message schemas (content, send request, MessageDto, page), ObjectId schema and typed Socket.IO events

## 0.4.0 (M3: rooms)

- feat(api): GET /rooms with joined/open scopes, sorted by name, cursor pagination
- feat(api): rooms module (create with auto-join, get, idempotent join/leave keeping memberCount in step, unique name → NET_NAME_TAKEN)
- feat(api): memberships module (unique { userId, roomId } index; add, remove, isMember, roomIdsFor)
- feat(api): cursor pagination helpers (opaque base64url cursors validated on decode, toPage with limit + 1 fetch)
- feat(types): pagination (page query, Page<T>) and room schemas (name, create request, list query, RoomDto)

## 0.3.1 (sessions per device)

- feat(api): sessions collection, one session per device (sliding expiry, TTL index, refresh-token reuse detection)

## 0.3.0 (M2: backend core auth and users modules)

- feat(api): auth endpoints (register, login, refresh with rotation, logout, me), web cookie or mobile body per X-Client, 10/min auth rate limit
- feat(api): TokensService (HS256 access JWT, opaque refresh tokens), global JwtAuthGuard with @Public() and @CurrentUser()
- feat(api): argon2id PasswordHasher (OWASP parameters, dummy verify against callsign enumeration)
- feat(api): users module (schema with unique callsign and refresh-token indexes, UsersService, toUserDto)
- feat(api): Helmet, CORS, cookie-parser, rate limiting, ApiError exception filter and ZodValidationPipe; shared configureApp for main and e2e
- feat(types): INTERNAL_ERROR error code
- feat(api): MongoDB connection (Mongoose), health check reports DB state, e2e on mongodb-memory-server (cached in CI)
- feat(api): env config validated with Zod at startup (typed ConfigService, fixed e2e env)
- chore(deps): zod in the pnpm catalog, declared by every package that imports it
- feat(types): auth request/response schemas and API error codes
- chore(api): remove Nest template leftovers; GET /api/health

## 0.2.0 (M1: theme tokens and UI primitives)

- feat(ui): Masthead, ScreenHeader, SectionLabel, RoomListItem, ChatBubble, MessageInput; shared ComponentPreview
- feat(ui): Input (form and chat variants, focus and error states) and StatusDot
- fix(ui): visible pressed feedback (push-in scale, sunken back button, no 50 ms web delay)
- feat(ui): Icon (react-native-svg) and IconButton; shared react-native-web Vite settings in @callsign/config
- feat(ui): ThemeProvider, useTheme, createStyles and the Text, Button and Card primitives; fonts and a preview in both apps
- feat(theme): light and dark design tokens with a WCAG contrast test
- docs: new light/dark mockups and a rewritten design brief (tokens, fonts, components, v1 scope)

## 0.1.0 (M0: tooling)

- docs: README with setup, how to run each app, the checks and the data model
- ci: GitHub Actions running format, lint, typecheck, unit and e2e tests and build
- chore: docker-compose MongoDB for local development and API .env.example
- feat(types): shared Zod package built with tsup (ESM + CJS), first schema: callsign
- feat(api): scaffold NestJS app with /api prefix, Jest unit and e2e tests
- feat(web): scaffold Vite app with react-native-web alias, dev proxy and Vitest smoke tests
- chore(config): add react-hooks lint rules and pin shared React versions in a pnpm catalog
- feat(mobile): scaffold Expo app with Expo Router, jest-expo and a first smoke test
- fix(config): set nodeLinker hoisted in pnpm-workspace.yaml (pnpm 12 ignores it in .npmrc)
- chore: enforce Conventional Commits with commitlint
- chore: ESLint, Prettier, strict tsconfig base, Husky + lint-staged pre-commit
- docs: project brief, design mockups and API contract
- chore: pnpm workspaces and Turborepo root setup
