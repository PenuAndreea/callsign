import type { Theme } from '@callsign/theme';
import { StyleSheet } from 'react-native';

import { useTheme } from './useTheme';

type NamedStyles<T> = StyleSheet.NamedStyles<T>;

/**
 * Defines themed styles once, at module level, and returns a hook that gives the styles
 * for the current theme. The two theme objects are constants, so each scheme's
 * `StyleSheet` is built once and then reused by every component instance.
 *
 * ```ts
 * const useStyles = createStyles(({ colors }) => ({ card: { backgroundColor: colors.surface } }));
 * ```
 */
export function createStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new WeakMap<Theme, T>();

  return function useStyles() {
    const theme = useTheme();
    const cached = cache.get(theme);
    if (cached) return cached;

    const styles = StyleSheet.create(factory(theme));
    cache.set(theme, styles);
    return styles;
  };
}
