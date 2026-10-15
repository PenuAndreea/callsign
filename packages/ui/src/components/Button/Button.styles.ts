import { radii, sizes, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';
import { disabledStyle, haloStyle, pressedStyle } from '../../theme/effects';

export const useButtonStyles = createStyles(({ colors }) => ({
  base: {
    minHeight: sizes.touch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    minHeight: sizes.button,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.button,
    backgroundColor: colors.primary,
    ...haloStyle(colors),
  },
  secondary: {
    minHeight: sizes.button,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  link: {
    paddingHorizontal: spacing.sm,
  },
  linkLabel: {
    textDecorationLine: 'underline',
  },
  pressed: pressedStyle,
  disabled: disabledStyle,
}));
