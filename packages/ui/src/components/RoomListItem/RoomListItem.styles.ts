import { radii, sizes, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';
import { pressedStyle, raisedStyle } from '../../theme/effects';

const BORDER_WIDTH = 2;

export const useRoomListItemStyles = createStyles(({ colors }) => ({
  row: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    // A transparent border keeps the size stable when the row is selected.
    borderWidth: BORDER_WIDTH,
    borderColor: 'transparent',
    ...raisedStyle(colors),
  },
  selected: {
    borderColor: colors.primary,
  },
  pressed: pressedStyle,
  texts: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
}));
