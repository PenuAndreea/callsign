import type { StyleProp, ViewStyle } from 'react-native';

export interface StatusToastProps {
  /** One short line, e.g. "No signal. Showing saved traffic." */
  message: string;
  /** Where it floats: the screen positions it (absolute, over its content). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
