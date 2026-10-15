/**
 * Stencil for headings, short labels and buttons; typewriter for message text and
 * inputs; mono for numbers and small tracked meta text.
 *
 * Custom fonts on native ignore `fontWeight`, so every face is its own family.
 * The names match the `@expo-google-fonts/*` keys loaded with `useFonts` on mobile;
 * the web `@font-face` rules declare the same names for the same files.
 */
export const fontFamilies = {
  stencil: 'StardosStencil_400Regular',
  stencilBold: 'StardosStencil_700Bold',
  typewriter: 'SpecialElite_400Regular',
  mono: 'ShareTechMono_400Regular',
} as const;

export const fontSizes = {
  caption: 11, // meta, time
  label: 12, // stencil field labels, sender callsign
  small: 13, // list preview, buttons
  body: 15, // message text
  input: 16,
  title: 30, // screen titles
  display: 34, // CALLSIGN wordmark
} as const;

/** Explicit line heights so text sits the same on web and native (Special Elite runs tight). */
export const lineHeights: Record<keyof typeof fontSizes, number> = {
  caption: 15,
  label: 16,
  small: 18,
  body: 21,
  input: 22,
  title: 34,
  display: 38,
};

/** Letter-spacing in px for the stencil and mono labels. */
export const letterSpacing = {
  tight: 1,
  normal: 1.5,
  label: 2,
  wide: 3,
  brand: 6, // CALLSIGN wordmark
} as const;
