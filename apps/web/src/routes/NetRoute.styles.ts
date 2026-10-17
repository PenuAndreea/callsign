import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useNetRouteStyles = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl, gap: spacing.xl },
}));
