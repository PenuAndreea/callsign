import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useNetsStyles = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl * 2 },
  header: { gap: spacing.lg, paddingBottom: spacing.sm },
  section: { paddingTop: spacing.xl, paddingBottom: spacing.md },
  separator: { height: spacing.md },
  status: { paddingVertical: spacing.md, gap: spacing.sm, alignItems: 'flex-start' },
}));
