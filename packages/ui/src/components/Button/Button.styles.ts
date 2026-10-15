import { radii, sizes, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';

const HALO_WIDTH = 6;

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
    boxShadow: `0 0 0 ${HALO_WIDTH}px ${colors.primaryHalo}`,
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
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
}));
