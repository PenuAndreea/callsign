import { radii, sizes } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';

export const useStatusDotStyles = createStyles(({ colors }) => ({
  dot: {
    width: sizes.lamp,
    height: sizes.lamp,
    borderRadius: radii.pill,
  },
  on: { backgroundColor: colors.lampOn },
  off: { backgroundColor: colors.lampOff },
}));
