import type { Theme } from '@callsign/theme';
import { createContext } from 'react';

/** `null` outside a `ThemeProvider`, so `useTheme` can fail loudly instead of guessing a scheme. */
export const ThemeContext = createContext<Theme | null>(null);
