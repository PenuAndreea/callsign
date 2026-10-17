import { sizes, spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useNetsLayoutStyles = createStyles(({ colors }) => ({
  split: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  sidebar: { width: sizes.sidebar, borderRightWidth: 1, borderRightColor: colors.surface },
  panel: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
}));
