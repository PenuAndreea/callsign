import type { StyleProp, ViewStyle } from 'react-native';

export interface MessageInputProps {
  /** Controlled draft text. */
  value: string;
  onChangeText: (text: string) => void;
  /** Called with the trimmed text when Send (TX) or the keyboard's return key is pressed. */
  onSend: (text: string) => void;
  /** Blocks sending, e.g. while disconnected. */
  disabled?: boolean;
  /** Pass the shared message schema's limit. */
  maxLength?: number;
  /** Defaults to "Type message. Over." */
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}
