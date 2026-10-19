import { radii } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

/** Diameter of a ripple before it grows (it scales up to 1.7x). */
export const PING_SIZE = 120;

export const usePingRingStyles = createStyles(({ colors }) => ({
  ring: {
    position: 'absolute',
    width: PING_SIZE,
    height: PING_SIZE,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.primary,
    opacity: 0,
  },
}));
