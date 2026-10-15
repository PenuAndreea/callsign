import { radii, sizes } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';
import { disabledStyle, haloStyle, pressedStyle, raisedStyle } from '../../theme/effects';

export const useIconButtonStyles = createStyles(({ colors }) => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  surface: {
    width: sizes.touch,
    height: sizes.touch,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    ...raisedStyle(colors),
  },
  primary: {
    width: sizes.tx,
    height: sizes.tx,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    ...haloStyle(colors),
  },
  pressed: pressedStyle,
  // A white (or dark) raised square barely changes with opacity alone: sink it into the page.
  surfacePressed: {
    backgroundColor: colors.surfaceInset,
    boxShadow: 'none',
  },
  disabled: disabledStyle,
}));
