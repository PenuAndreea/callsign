# Callsign: design

Modern field-radio style, light and dark. Mockups sit next to this file; token values are in `packages/theme` (mapped in `callsign-palette.md`).

A clean, modern UI with a field-radio voice. The radio feel comes from typography, the olive/brass palette and the copy tone. Rounded corners and soft shadows are fine, but no gradients and no textures. No `.native` / `.web` component splits.

**Mockups** (this folder, each in `-light` and `-dark`): `signin`, `register`, `chats` (nets list), `chat`. They also show features planned for later versions; build only what is in **Scope (v1)** (`CLAUDE.md`). Out of scope in the mockups: the role selector, full name and home field, the frequency display and tuner ticks, the "LIVE" indicator, the priority picker and priority badge, signal strength, read receipts ("ROGER"), unread counts, the alert net, the bottom tab bar (Direct/Me), the "carrier online / 17 stations" footer and the compass rose background (nice-to-have for M6).

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
- **Timestamps:** 24-hour time in the device's time zone, e.g. `22:14`.
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
  - `ChatBubble`: incoming on surface with the sender callsign in `label` color, outgoing on `bubbleOut`; meta line with the local time.
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
