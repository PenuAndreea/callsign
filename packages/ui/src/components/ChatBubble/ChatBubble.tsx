import { View } from 'react-native';

import { formatZulu } from '../../utils/formatZulu';
import { Text } from '../Text/Text';
import { useChatBubbleStyles } from './ChatBubble.styles';
import type { ChatBubbleProps } from './ChatBubble.types';

/** One message: incoming on the surface with the sender's callsign, own on the primary color. */
export function ChatBubble({
  content,
  senderCallsign,
  sentAt,
  own = false,
  style,
}: ChatBubbleProps) {
  const styles = useChatBubbleStyles();
  const time = formatZulu(sentAt);

  return (
    <View style={[styles.bubble, own ? styles.own : styles.incoming, style]}>
      {!own && <Text variant="label">{senderCallsign}</Text>}
      <Text variant="body" tone={own ? 'bubbleOutText' : 'text'}>
        {content}
      </Text>
      <Text variant="meta" tone={own ? 'bubbleOutMeta' : 'textMuted'} style={own && styles.ownTime}>
        {time}
      </Text>
    </View>
  );
}
