import type { ColorScheme } from '@callsign/theme';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';

import { ThemeProvider } from '../theme/ThemeProvider';

/** Renders inside a `ThemeProvider` with a fixed scheme (light by default). */
export function renderWithTheme(
  ui: ReactElement,
  { scheme = 'light', ...options }: { scheme?: ColorScheme } & Omit<RenderOptions, 'wrapper'> = {},
) {
  return render(ui, {
    ...options,
    wrapper: ({ children }) => <ThemeProvider scheme={scheme}>{children}</ThemeProvider>,
  });
}
