import { spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';

export const useScreenHeaderStyles = createStyles(() => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  titles: {
    flex: 1,
    // Lets a truncated title shrink instead of pushing the action off screen.
    minWidth: 0,
    gap: spacing.xs,
  },
}));
