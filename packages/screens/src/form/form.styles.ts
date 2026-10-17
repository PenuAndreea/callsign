import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

/** Fields and actions of every form screen (sign in, register, new net). */
export const useFormStyles = createStyles(() => ({
  fields: { gap: spacing.lg },
  actions: { gap: spacing.md, paddingTop: spacing.sm },
}));
