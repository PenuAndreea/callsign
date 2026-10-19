import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

/** How far a letter (and the tagline) rises while it fades in. */
export const LETTER_RISE = 14;
export const TAGLINE_RISE = 8;

export const useSplashWordmarkStyles = createStyles(() => ({
  root: { alignItems: 'center', marginTop: spacing.xxl },
  row: { flexDirection: 'row' },
  tagline: { marginTop: spacing.sm },
}));
