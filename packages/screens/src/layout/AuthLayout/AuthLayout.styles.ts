import { sizes, spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useAuthLayoutStyles = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: sizes.form,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  // Without a header row the masthead sits lower, as in the mockups.
  noHeader: { paddingTop: spacing.xxl * 2 },
  body: { flexGrow: 1, gap: spacing.xl },
  footer: { textAlign: 'center' },
}));
