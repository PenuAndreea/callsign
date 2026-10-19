import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '../Icon/Icon.types';

export type ButtonVariant = 'primary' | 'secondary' | 'link';

export type ButtonSize = 'regular' | 'small';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Visible text; also the accessible name unless `accessibilityLabel` is set. */
  label: string;
  /** `primary`: filled with a halo; `secondary`: outline; `link`: underlined meta text. */
  variant?: ButtonVariant;
  /** `small`: compact for list rows (the 44 touch target, a smaller label). Links have one size. */
  size?: ButtonSize;
  disabled?: boolean;
  /** Decorative glyph after the label, e.g. `arrowRight` on "Report in". Hidden from screen readers. */
  icon?: IconName;
  /** Shows a spinner in place of the label and blocks presses. */
  loading?: boolean;
  /** Layout only (margins, alignment); colors come from the variant. */
  style?: StyleProp<ViewStyle>;
}
