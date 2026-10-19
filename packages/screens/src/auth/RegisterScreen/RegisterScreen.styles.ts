import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

export const useRegisterStyles = createStyles(() => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  formId: { paddingLeft: spacing.md },
}));
