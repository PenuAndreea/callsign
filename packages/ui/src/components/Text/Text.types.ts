import type { ThemeColors } from '@callsign/theme';
import type { TextProps as RNTextProps } from 'react-native';

export type TextVariant =
  'display' | 'title' | 'heading' | 'button' | 'label' | 'body' | 'small' | 'meta';

/** Color keys that are meant for text. */
export type TextTone = Extract<
  keyof ThemeColors,
  | 'text'
  | 'textMuted'
  | 'label'
  | 'primary'
  | 'onPrimary'
  | 'bubbleOutText'
  | 'bubbleOutMeta'
  | 'dangerText'
  | 'onDanger'
  | 'displayText'
  | 'displayMuted'
>;

export interface TextProps extends RNTextProps {
  /** Typographic role; sets font, size, line height, case and tracking. Defaults to `body`. */
  variant?: TextVariant;
  /** Overrides the variant's default color. */
  tone?: TextTone;
}
