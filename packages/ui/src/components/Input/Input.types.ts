import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';

export type InputVariant = 'form' | 'chat';

export interface InputProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  /** Accessible name; shown above the field unless `hideLabel` is set. */
  label: string;
  /** `form`: raised surface field under a label. `chat`: pill on the composer sheet. */
  variant?: InputVariant;
  /** Keeps the label for screen readers only (the chat composer has no visible label). */
  hideLabel?: boolean;
  /** Shown under the field and announced; also marks the field invalid. */
  error?: string;
  /** Layout of the wrapper (margins, flex). */
  style?: StyleProp<ViewStyle>;
}
