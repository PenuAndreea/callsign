import { radii, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';

export const useMessageInputStyles = createStyles(({ colors }) => ({
  sheet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    backgroundColor: colors.sheet,
  },
  field: {
    flex: 1,
  },
}));
