import { themes, type ColorScheme } from '@callsign/theme';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { ThemeContext } from './ThemeContext';

export interface ThemeProviderProps {
  /** Forces a scheme. When omitted, the system setting decides (light if it is unknown). */
  scheme?: ColorScheme;
  children: ReactNode;
}

export function ThemeProvider({ scheme, children }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const resolved: ColorScheme = scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');

  return <ThemeContext.Provider value={themes[resolved]}>{children}</ThemeContext.Provider>;
}
