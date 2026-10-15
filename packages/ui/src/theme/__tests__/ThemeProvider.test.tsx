import { darkTheme } from '@callsign/theme';
import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '../ThemeProvider';
import { useTheme } from '../useTheme';

const { useColorScheme } = vi.hoisted(() => ({
  useColorScheme: vi.fn<() => 'light' | 'dark' | null>(),
}));

vi.mock('react-native', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useColorScheme,
}));

function SchemeName() {
  return <span>{useTheme().scheme}</span>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    useColorScheme.mockReset();
  });

  it('follows a dark system setting', () => {
    useColorScheme.mockReturnValue('dark');
    render(
      <ThemeProvider>
        <SchemeName />
      </ThemeProvider>,
    );

    expect(screen.getByText('dark')).toBeInTheDocument();
  });

  it('falls back to light when the system scheme is unknown', () => {
    useColorScheme.mockReturnValue(null);
    render(
      <ThemeProvider>
        <SchemeName />
      </ThemeProvider>,
    );

    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('lets the scheme prop override the system setting', () => {
    useColorScheme.mockReturnValue('dark');
    render(
      <ThemeProvider scheme="light">
        <SchemeName />
      </ThemeProvider>,
    );

    expect(screen.getByText('light')).toBeInTheDocument();
  });
});

describe('useTheme', () => {
  it('returns the theme object for the scheme', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ThemeProvider scheme="dark">{children}</ThemeProvider>
    );

    expect(renderHook(() => useTheme(), { wrapper }).result.current).toBe(darkTheme);
  });

  it('throws outside a ThemeProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useTheme())).toThrow('inside a ThemeProvider');
  });
});
