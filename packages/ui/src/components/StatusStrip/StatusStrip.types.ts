import type { StyleProp, ViewStyle } from 'react-native';

export interface StatusStripProps {
  /** One short line, e.g. "No signal. Showing saved traffic." */
  message: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
