import { darkColors } from './colors.dark';
import { lightColors } from './colors.light';
import type { ColorScheme, ThemeColors } from './colors.types';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
}

export const lightTheme: Theme = { scheme: 'light', colors: lightColors };
export const darkTheme: Theme = { scheme: 'dark', colors: darkColors };

export const themes: Record<ColorScheme, Theme> = { light: lightTheme, dark: darkTheme };
