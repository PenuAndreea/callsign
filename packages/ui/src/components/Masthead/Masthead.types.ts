import type { StyleProp, ViewStyle } from 'react-native';

export interface MastheadProps {
  /** Large stencil title, e.g. "Callsign" or "Register". */
  title: string;
  /** Tracked line under the title, e.g. "Field radio · Flight and ground". */
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}
