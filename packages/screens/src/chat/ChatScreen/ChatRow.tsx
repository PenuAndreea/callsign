import type { ChatEntry } from '@callsign/hooks';
import { Button, ChatBubble, Text } from '@callsign/ui';
import { View } from 'react-native';

import { errorMessageForCode } from '../../errors/errorMessage';
import { useChatStyles } from './ChatScreen.styles';

interface ChatRowProps {
  entry: ChatEntry;
  /** The signed-in user: their saved messages are "own". */
  userId: string;
  userCallsign: string;
  /** The net is live: a queued send goes out now, not when the signal returns. */
  live: boolean;
  onRetry: (clientMessageId: string) => void;
  onDiscard: (clientMessageId: string) => void;
}

/**
 * A saved message, or this device's pending send: "Sending", "Waiting for signal" (queued while
 * the net is down, with Discard to take it back), or "Not sent" (with Retry and Discard).
 */
export function ChatRow({ entry, userId, userCallsign, live, onRetry, onDiscard }: ChatRowProps) {
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
  const waiting = !failed && !live;
  const discard = (
    <Button label="Discard" variant="link" onPress={() => onDiscard(pending.clientMessageId)} />
  );
  return (
    <View style={styles.pending}>
      <ChatBubble
        own
        content={pending.content}
        senderCallsign={userCallsign}
        sentAt={pending.createdAt}
        status={failed ? 'Not sent' : waiting ? 'Waiting for signal' : 'Sending'}
      />
      {failed && (
        <View style={styles.failedRow}>
          {pending.error !== null && (
            <Text variant="small" tone="dangerText">
              {errorMessageForCode(pending.error)}
            </Text>
          )}
          <Button label="Retry" variant="link" onPress={() => onRetry(pending.clientMessageId)} />
          {discard}
        </View>
      )}
      {waiting && <View style={styles.failedRow}>{discard}</View>}
    </View>
  );
}
