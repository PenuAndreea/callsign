# M1: theme tokens and UI library (0.2.0)

## Starting point

Before M1 I redesigned the mockups (light and dark, more modern) and exported them to `docs/design/`. The AI compared them with the brief and listed what changed (two schemes, rounded corners and soft shadows, a third mono font), what in the mockups is out of scope for v1 (roles, frequency display, priority, read receipts, unread counts, tab bar) and which screens had no mockup (new net, web chat layout, Join and Leave).

## Decisions

1. **Fonts:** a third font (Share Tech Mono). The same files from `@expo-google-fonts/*` on both platforms: `useFonts` on mobile, `@font-face` on web with the **same family names**, so one `fontFamily` token works everywhere and nothing loads from Google at runtime.
2. **Icons:** `react-native-svg` (works on web through react-native-web) with a few hand-made icons.
3. **Theme switching:** follow the system scheme through `useColorScheme()`; `ThemeProvider` takes an optional override for a manual toggle later.
4. **Package split:** `packages/theme` is plain TypeScript with no React; `ThemeProvider`, `useTheme` and `createStyles(theme => …)` live in `packages/ui`.
5. **Testing `packages/ui`:** Vitest + jsdom + Testing Library with a `react-native` → `react-native-web` alias, the same setup as web. Queries by role and label double as accessibility checks.

## Plan

1. **`packages/theme`:** light and dark semantic colors with one shared type (they can't drift apart), spacing, radii, typography, `minTouch = 44`, shadows through the `boxShadow` style prop (RN 0.86 and react-native-web 0.21 both support it). A test asserts that every text/surface pair reaches 4.5:1.
2. **Primitives:** `ThemeProvider` / `useTheme` / `createStyles`, `Text`, `Button`, `IconButton` (requires an `accessibilityLabel`), `Input` (form and chat variants), `Card`, `StatusDot`, `Icon`.
3. **De-risk checkpoint:** render `Button` and `Card` in both apps, light and dark, fonts loaded, before going further.
4. **Composed components:** `Masthead`, `ScreenHeader`, `SectionLabel`, `RoomListItem`, `ChatBubble`, `MessageInput`.

Each component in its own folder (`X.tsx`, `X.styles.ts`, `X.types.ts`, `X.test.tsx`).

## Review of my token files

I wrote the first color and typography tokens myself. The AI's review before they went into `packages/theme`:

- **Font names didn't work on native.** On iOS and Android a custom font ignores `fontWeight`, so each weight needs its own token (`StardosStencil_700Bold`, …).
- **Dark placeholder contrast was 4.2:1**, under the 4.5:1 target, so the dark `textMuted` changed.
- Leave the later-version tokens (frequency display, badges) out until something uses them; add line heights; blend the semi-transparent `dangerSoft` onto its surface before the contrast test; split the file per concern (`colors.light.ts`, `colors.dark.ts`, `typography.ts`, …).

## Outcome

Released as `v0.2.0` (PR #2). A visual check in the apps found that pressed buttons gave no feedback, so a fix added a push-in scale, a sunken back button and removed the 50 ms web delay.
