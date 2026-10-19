import type { ChatEntry } from '@callsign/hooks';
import { Button, ChatBubble, Text } from '@callsign/ui';
import { View } from 'react-native';

import { sendErrorMessage } from '../../errors/errorMessage';
import { useChatStyles } from './ChatScreen.styles';

interface ChatRowProps {
  entry: ChatEntry;
  /** The signed-in user: their saved messages are "own". */
  userId: string;
  userCallsign: string;
  onRetry: (clientMessageId: string) => void;
  onDiscard: (clientMessageId: string) => void;
}

/** A saved message, or this device's pending send ("Sending", or "Not sent" with Retry). */
export function ChatRow({ entry, userId, userCallsign, onRetry, onDiscard }: ChatRowProps) {
  const styles = useChatStyles();

  if (entry.type === 'message') {
    const { message } = entry;
    return (
      <ChatBubble
        content={message.content}
        senderCallsign={message.sender.callsign}
        sentAt={message.createdAt}
        own={message.sender.id === userId}
      />
    );
  }

  const { pending } = entry;
  const failed = pending.status === 'failed';
  return (
    <View style={styles.pending}>
      <ChatBubble
        own
        content={pending.content}
        senderCallsign={userCallsign}
        sentAt={pending.createdAt}
        status={failed ? 'Not sent' : 'Sending'}
      />
      {failed && (
        <View style={styles.failedRow}>
          {pending.error !== null && (
            <Text variant="small" tone="dangerText">
              {sendErrorMessage(pending.error)}
            </Text>
          )}
          <Button label="Retry" variant="link" onPress={() => onRetry(pending.clientMessageId)} />
          <Button
            label="Discard"
            variant="link"
            onPress={() => onDiscard(pending.clientMessageId)}
          />
        </View>
      )}
    </View>
  );
}
