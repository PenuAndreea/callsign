import { radii, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';

export const useCardStyles = createStyles(({ colors }) => ({
  card: {
    padding: spacing.xl,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    boxShadow: `0 2px 8px ${colors.shadow}`,
  },
}));
