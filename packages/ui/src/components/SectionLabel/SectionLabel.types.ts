import type { StyleProp, TextStyle } from 'react-native';

export interface SectionLabelProps {
  /** Short section name, e.g. "Joined" or "Open to join" (shown uppercase). */
  title: string;
  style?: StyleProp<TextStyle>;
}
