import { radii, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';

export const useStatusStripStyles = createStyles(({ colors }) => ({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.input,
    backgroundColor: colors.surfaceInset,
  },
  message: { flexShrink: 1 },
}));
