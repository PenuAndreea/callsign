import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

export type ButtonVariant = 'primary' | 'secondary' | 'link';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style' | 'disabled'> {
  /** Visible text; also the accessible name unless `accessibilityLabel` is set. */
  label: string;
  /** `primary`: filled with a halo; `secondary`: outline; `link`: underlined meta text. */
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Shows a spinner in place of the label and blocks presses. */
  loading?: boolean;
  /** Layout only (margins, alignment); colors come from the variant. */
  style?: StyleProp<ViewStyle>;
}
