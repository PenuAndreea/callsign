# Changelog

One short line per commit, newest first. Each milestone is a release: M0 = 0.1.0, M1 = 0.2.0, and so on; 1.0.0 is the finished v1 scope.

## Unreleased

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
