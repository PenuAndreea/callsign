import { View } from 'react-native';

import { formatTime } from '../../utils/formatTime';
import { Text } from '../Text/Text';
import { useChatBubbleStyles } from './ChatBubble.styles';
import type { ChatBubbleProps } from './ChatBubble.types';

/** One message: incoming on the surface with the sender's callsign, own on the primary color. */
export function ChatBubble({
  content,
  senderCallsign,
  sentAt,
  own = false,
  status,
  style,
}: ChatBubbleProps) {
  const styles = useChatBubbleStyles();
  const time = formatTime(sentAt);

  return (
    <View style={[styles.bubble, own ? styles.own : styles.incoming, style]}>
      {!own && <Text variant="label">{senderCallsign}</Text>}
      <Text variant="body" tone={own ? 'bubbleOutText' : 'text'}>
        {content}
      </Text>
      <Text variant="meta" tone={own ? 'bubbleOutMeta' : 'textMuted'} style={own && styles.ownTime}>
        {status === undefined ? time : `${time} · ${status}`}
      </Text>
    </View>
  );
}
