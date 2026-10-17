import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface InsetPadding {
  paddingTop?: number;
  paddingBottom?: number;
}

/**
 * Padding that clears the notch / status bar (top) and the home indicator (bottom): the base
 * padding plus the safe-area inset. Screens own the insets; components never pad for them.
 * Zero insets on web.
 */
export function useInsetPadding({ top, bottom }: { top?: number; bottom?: number }): InsetPadding {
  const insets = useSafeAreaInsets();
  return {
    ...(top !== undefined && { paddingTop: top + insets.top }),
    ...(bottom !== undefined && { paddingBottom: bottom + insets.bottom }),
  };
}
