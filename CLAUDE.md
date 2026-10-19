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
- All of them are built (M1). `@callsign/ui/preview` exports `ComponentPreview`, one scrolling screen with every component, kept as a visual reference; both apps render the real screens since M5. Screens own the safe-area insets (`react-native-safe-area-context`, `useInsetPadding` in `packages/screens`), so components never pad for the notch or home indicator; web wraps the app in a `SafeAreaProvider` (zero insets). `KeyboardFrame` (`KeyboardAvoidingView`, `padding` on both platforms: Android is edge-to-edge) keeps the composer and form fields above the keyboard. `Input` forwards `ref` to its `TextInput`, so `FormInput` hands react-hook-form the field: "next" keys call `setFocus`, and a failed submit focuses the first invalid field. Passphrase fields set `autoCapitalize="none"` and `autoCorrect={false}` (Android keyboards capitalize the first letter otherwise).

**Screens:**

- Sign in (`signin`): `Masthead` "CALLSIGN"; callsign + passphrase; "Report in" primary button; "New station? Register here" link.
- Register (`register`): back button, `Masthead` "REGISTER"; callsign (3 to 20 characters), passphrase (at least 8 characters), confirm passphrase (not in the mockup, kept from the spec); "Request clearance" button; "Already on the net? Report in" link.
- Nets list (`chats`): header with the user's callsign above the title; joined nets (green dot, name, member count, last message), then open nets with a Join button. "+ New net" and Log out. No mockup for the open-nets section; reuse `RoomListItem`.
- Chat (`chat`): `ScreenHeader` with back, net name, member count and "Leave"; own vs other messages; `MessageInput`. Typing line only if the optional indicator is built.
- New net (no mockup): name field only (3 to 30 characters), note that the net is open to all. Built from `ScreenHeader`, `Input`, `Button`.
- Web chat (no mockup): sidebar with nets next to the chat panel; stacks on narrow widths. Same components as mobile, only the layout differs.
