import { fontFamilies } from '@callsign/theme';
import shareTechMono from '@expo-google-fonts/share-tech-mono/400Regular/ShareTechMono_400Regular.ttf?url';
import specialElite from '@expo-google-fonts/special-elite/400Regular/SpecialElite_400Regular.ttf?url';
import stardosStencil from '@expo-google-fonts/stardos-stencil/400Regular/StardosStencil_400Regular.ttf?url';
import stardosStencilBold from '@expo-google-fonts/stardos-stencil/700Bold/StardosStencil_700Bold.ttf?url';

/** Same font files as mobile; typed by the theme keys so no family can be missed. */
const fontUrls: Record<keyof typeof fontFamilies, string> = {
  stencil: stardosStencil,
  stencilBold: stardosStencilBold,
  typewriter: specialElite,
  mono: shareTechMono,
};

/**
 * Registers every theme font under its token name (e.g. `StardosStencil_700Bold`), the same
 * family names Expo uses on native, so one `fontFamily` value works on both platforms.
 */
export function loadFonts(fonts: FontFaceSet = document.fonts): Promise<FontFace[]> {
  const faces = Object.entries(fontUrls).map(([key, url]) => {
    const family = fontFamilies[key as keyof typeof fontFamilies];
    const face = new FontFace(family, `url(${url})`, { display: 'swap' });
    fonts.add(face);
    return face.load();
  });
  return Promise.all(faces);
}
