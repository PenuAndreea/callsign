import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useChatStyles = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.md },
  list: { flex: 1 },
  messages: { padding: spacing.xl, gap: spacing.md },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  centerText: { textAlign: 'center' },
  listEdge: { alignItems: 'center', paddingVertical: spacing.md },
  pending: { gap: spacing.xs, alignItems: 'flex-end' },
  failedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
}));
