# Callsign design tokens

The values live in [`packages/theme/src`](../../packages/theme/src) and are not repeated here. Dark theme = V2 (olive-charcoal + brass), light theme = V3 (cool white-gray + olive drab), from the "Callsign Chat" design canvas. Both themes expose the same semantic keys, so components use `colors.surface`, `colors.primary`, etc. and never raw hex values.

| File               | Holds                                                         |
| ------------------ | ------------------------------------------------------------- |
| `colors.types.ts`  | `ThemeColors` (every key, documented) and `ColorScheme`       |
| `colors.light.ts`  | light values                                                  |
| `colors.dark.ts`   | dark values                                                   |
| `typography.ts`    | font families (one per face), sizes, line heights, tracking   |
| `layout.ts`        | spacing, radii, sizes                                         |
| `theme.ts`         | `lightTheme`, `darkTheme`, `themes`                           |
| `contrast.ts`      | WCAG contrast helpers used by the theme tests (not exported)  |

Rules of thumb:

- Brass only in the dark theme, olive drab only in the light theme (both live in `primary`).
- Red (`danger`) only for errors and destructive actions in v1.
- Stencil font for short labels and headings, typewriter for message text and inputs, mono for numbers and small meta text.
- Minimum tap target 44, screen gutter 20.
- Text pairs reach 4.5:1 and status dots 3:1 in both themes; `src/__tests__/theme.test.ts` checks every pair, so a value change that breaks contrast fails the tests.

Changes from the design canvas:

- Dark `textMuted` is `#A3A588` instead of `#9A9C80`, to reach 4.5:1 on `surfaceInset` (composer placeholder).
- Added `primaryHalo` (translucent `primary`) for the ring around primary buttons.
- Added `lineHeights`; Special Elite runs tight without them.
- Left out until their features land: `display`, `displayText`, `displayMuted`, `frequency`, `tick`, `needle` (frequency display), `badge` / `onBadge` (unread counts), the `micro` font size (priority tag) and the segmented-control radii.

Values of the left-out tokens, for when their features land:

| Token          | Dark                      | Light                      |
| -------------- | ------------------------- | -------------------------- |
| `display`      | `#2A2F21`                 | `#1F2318`                  |
| `displayText`  | `#9FD36A`                 | `#9FD36A`                  |
| `displayMuted` | `#9A9C80`                 | `#A9AB8E`                  |
| `frequency`    | `#9FD36A`                 | `#2F6A14`                  |
| `tick`         | `#4A5139`                 | `#B5BAA8`                  |
| `needle`       | `#C9A24D`                 | `#B5432C`                  |
| `badge`        | `#C9A24D`                 | `#556B2F`                  |
| `onBadge`      | `#1F2318`                 | `#FFFFFF`                  |

Also left out: font size `micro: 10` (priority tag), radii `segmentItem: 10` and `segment: 14` (segmented control).
