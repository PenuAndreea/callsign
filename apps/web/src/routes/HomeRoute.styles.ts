import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useHomeStyles = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background, padding: spacing.xl },
}));
