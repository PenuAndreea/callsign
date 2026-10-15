import type { StyleProp, ViewStyle } from 'react-native';

export interface ChatBubbleProps {
  /** Message text. */
  content: string;
  /** Sender's callsign, shown on incoming messages (uppercase). */
  senderCallsign: string;
  /** Send time; shown in Zulu, e.g. `22:14Z`. The API sends ISO strings. */
  sentAt: Date | string;
  /** Own message: right-aligned on the primary color, without the sender line. */
  own?: boolean;
  style?: StyleProp<ViewStyle>;
}
