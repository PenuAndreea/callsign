import { radii, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';
import { raisedStyle } from '../../theme/effects';

export const useStatusToastStyles = createStyles(({ colors }) => ({
  toast: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.warning,
    ...raisedStyle(colors),
    // Floats over the traffic: taps go through to what is under it.
    pointerEvents: 'none',
  },
  message: { textAlign: 'center' },
}));
