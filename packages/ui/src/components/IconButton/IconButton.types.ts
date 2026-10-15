import type { PressableProps, StyleProp, ViewStyle } from 'react-native';

import type { IconName } from '../Icon/Icon.types';

export type IconButtonVariant = 'surface' | 'primary';

/** Either a glyph (back, plus) or a short stencil text (TX), never both. */
type IconButtonContent = { icon: IconName; text?: never } | { text: string; icon?: never };

export type IconButtonProps = Omit<
  PressableProps,
  'children' | 'style' | 'disabled' | 'aria-label'
> &
  IconButtonContent & {
    /** Required: the visible content is not a name a screen reader can use ("Back", "Send"). */
    'aria-label': string;
    /** `surface`: square raised button (back). `primary`: round filled button with a halo (TX). */
    variant?: IconButtonVariant;
    disabled?: boolean;
    /** Layout only (margins, alignment). */
    style?: StyleProp<ViewStyle>;
  };
