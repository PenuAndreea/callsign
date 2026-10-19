import { sizes, spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useFormLayoutStyles = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: sizes.form,
    alignSelf: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  body: { flexGrow: 1, gap: spacing.xl },
  footer: { textAlign: 'center' },
}));
