import type { StyleProp, ViewStyle } from 'react-native';

export interface StatusDotProps {
  /** Lit (`lampOn`) or dark (`lampOff`). */
  on: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
