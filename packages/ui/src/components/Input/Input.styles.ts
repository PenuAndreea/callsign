import { fontFamilies, fontSizes, radii, sizes, spacing } from '@callsign/theme';

import { createStyles } from '../../theme/createStyles';
import { raisedStyle } from '../../theme/effects';

const BORDER_WIDTH = 2;

export const useInputStyles = createStyles(({ colors }) => ({
  wrapper: {
    gap: spacing.sm,
  },
  field: {
    minHeight: sizes.input,
    paddingHorizontal: spacing.xl,
    fontFamily: fontFamilies.typewriter,
    fontSize: fontSizes.input,
    color: colors.text,
    // A transparent border keeps the size stable when focus or error colors it.
    borderWidth: BORDER_WIDTH,
    borderColor: 'transparent',
    // Our focus border replaces the browser outline on web.
    outlineWidth: 0,
  },
  form: {
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    ...raisedStyle(colors),
  },
  chat: {
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceInset,
  },
  focused: {
    borderColor: colors.primary,
  },
  invalid: {
    borderColor: colors.danger,
  },
}));
