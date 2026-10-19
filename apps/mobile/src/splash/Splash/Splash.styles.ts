import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useSplashStyles = createStyles(({ colors }) => ({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxl + spacing.lg,
    backgroundColor: colors.background,
  },
}));
