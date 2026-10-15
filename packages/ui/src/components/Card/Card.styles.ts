import { radii, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';
import { raisedStyle } from '../../theme/effects';

export const useCardStyles = createStyles(({ colors }) => ({
  card: {
    padding: spacing.xl,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    ...raisedStyle(colors),
  },
}));
