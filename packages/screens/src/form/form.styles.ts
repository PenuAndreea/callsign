import { spacing } from '@callsign/theme';
import { createStyles } from '@callsign/ui';

/** Shared by the sign-in and register forms. */
export const useAuthFormStyles = createStyles(() => ({
  fields: { gap: spacing.lg },
  actions: { gap: spacing.md, paddingTop: spacing.sm },
}));
