import { darkColors, lightColors, type ColorScheme } from '@callsign/theme';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createStyles } from '../createStyles';
import { ThemeProvider } from '../ThemeProvider';

function wrapperFor(scheme: ColorScheme) {
  return ({ children }: { children: ReactNode }) => (
    <ThemeProvider scheme={scheme}>{children}</ThemeProvider>
  );
}

describe('createStyles', () => {
  it('builds styles from the current theme', () => {
    const useStyles = createStyles(({ colors }) => ({ box: { backgroundColor: colors.surface } }));

    const light = renderHook(() => useStyles(), { wrapper: wrapperFor('light') }).result.current;
    const dark = renderHook(() => useStyles(), { wrapper: wrapperFor('dark') }).result.current;

    expect(light.box.backgroundColor).toBe(lightColors.surface);
    expect(dark.box.backgroundColor).toBe(darkColors.surface);
  });

  it('builds each scheme once and reuses it', () => {
    const factory = vi.fn(({ colors }: { colors: { text: string } }) => ({
      label: { color: colors.text },
    }));
    const useStyles = createStyles(factory);

    const first = renderHook(() => useStyles(), { wrapper: wrapperFor('light') });
    const second = renderHook(() => useStyles(), { wrapper: wrapperFor('light') });
    first.rerender();

    expect(factory).toHaveBeenCalledTimes(1);
    expect(first.result.current).toBe(second.result.current);
  });
});
