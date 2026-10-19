import type { StyleProp, ViewStyle } from 'react-native';

export interface ChatBubbleProps {
  /** Message text. */
  content: string;
  /** Sender's callsign, shown on incoming messages (uppercase). */
  senderCallsign: string;
  /** Send time; shown in the device's time zone, e.g. `22:14`. The API sends ISO strings. */
  sentAt: Date | string;
  /** Own message: right-aligned on the primary color, without the sender line. */
  own?: boolean;
  /** Delivery note after the time on the meta line, e.g. "Sending" or "Not sent". */
  status?: string;
  style?: StyleProp<ViewStyle>;
}
