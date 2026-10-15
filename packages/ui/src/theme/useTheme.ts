import type { Theme } from '@callsign/theme';
import { useContext } from 'react';

import { ThemeContext } from './ThemeContext';

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used inside a ThemeProvider');
  return theme;
}
