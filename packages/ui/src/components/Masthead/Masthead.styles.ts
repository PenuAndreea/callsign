import { spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';

export const LOGO_SIZE = 72;

export const useMastheadStyles = createStyles(() => ({
  masthead: {
    alignItems: 'center',
    gap: spacing.md,
  },
  subtitle: {
    textAlign: 'center',
  },
}));
