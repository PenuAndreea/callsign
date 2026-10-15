import { fontFamilies } from '@callsign/theme';
import { ShareTechMono_400Regular } from '@expo-google-fonts/share-tech-mono';
import { SpecialElite_400Regular } from '@expo-google-fonts/special-elite';
import {
  StardosStencil_400Regular,
  StardosStencil_700Bold,
} from '@expo-google-fonts/stardos-stencil';

/**
 * Font map for `useFonts`, keyed by the theme family names (which are the Expo keys), so
 * the same `fontFamily` value works on native and web. Typed by the theme so no family is missed.
 */
export const fontSources: Record<(typeof fontFamilies)[keyof typeof fontFamilies], number> = {
  [fontFamilies.stencil]: StardosStencil_400Regular,
  [fontFamilies.stencilBold]: StardosStencil_700Bold,
  [fontFamilies.typewriter]: SpecialElite_400Regular,
  [fontFamilies.mono]: ShareTechMono_400Regular,
};
