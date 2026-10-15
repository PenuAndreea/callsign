import type { StyleProp, ViewStyle } from 'react-native';

import type { TextTone } from '../Text/Text.types';

export type IconName = 'chevronLeft' | 'arrowRight' | 'plus' | 'radio';

/** Colors an icon can take: the text tones plus the status lamp. */
export type IconTone = TextTone | 'lampOn';

export interface IconProps {
  name: IconName;
  /** Width and height in points. Defaults to 24. */
  size?: number;
  /** Defaults to `text`. */
  tone?: IconTone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
