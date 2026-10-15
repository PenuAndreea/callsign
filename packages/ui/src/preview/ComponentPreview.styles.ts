import { spacing } from '@callsign/theme';

import { createStyles } from '../theme/createStyles';

export const usePreviewStyles = createStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingTop: spacing.xxl * 3, gap: spacing.xl },
  section: { gap: spacing.md },
  messages: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
}));
