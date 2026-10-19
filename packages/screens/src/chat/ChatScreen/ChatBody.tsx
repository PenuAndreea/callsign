import type { ChatEntry } from '@callsign/hooks';
import { isApiClientError } from '@callsign/hooks';
import { Button, Text } from '@callsign/ui';
import type { RefObject } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { errorMessage } from '../../errors/errorMessage';
import { ChatRow } from './ChatRow';
import { useChatStyles } from './ChatScreen.styles';

export interface ChatBodyProps {
  entries: ChatEntry[];
  /** For scrolling to the newest message (offset 0 of the inverted list) after a send. */
  listRef: RefObject<FlatList<ChatEntry> | null>;
  isPending: boolean;
  error: Error | null;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onRetryLoad: () => void;
  /** Shown when the history says `NOT_A_MEMBER` (opened from a link, or left elsewhere). */
  onJoin: () => void;
  joining: boolean;
  userId: string;
  userCallsign: string;
  onRetrySend: (clientMessageId: string) => void;
  onDiscard: (clientMessageId: string) => void;
}

/**
 * The message area: newest at the bottom (inverted list, older pages load when scrolling up),
 * or the first load, the empty net, a failed load, or the offer to join.
 */
// `listRef` apart from `props`: the React Compiler treats an object holding a ref as a ref.
export function ChatBody({ listRef, ...props }: ChatBodyProps) {
  const styles = useChatStyles();
  const { entries, error } = props;

  if (isApiClientError(error, 'NOT_A_MEMBER')) {
    return (
      <View style={styles.center}>
        <Text variant="body" style={styles.centerText}>
          You are not on this net. Join to read the traffic and transmit.
        </Text>
        <Button label="Join the net" loading={props.joining} onPress={props.onJoin} />
      </View>
    );
  }
  if (error && entries.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="body" tone="dangerText" role="alert" style={styles.centerText}>
          {errorMessage(error)}
        </Text>
        <Button label="Try again" variant="link" onPress={props.onRetryLoad} />
      </View>
    );
  }
  if (props.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  // Outside the list: an inverted list would show its empty component upside down.
  if (entries.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="body" tone="textMuted" style={styles.centerText}>
          No traffic yet. Open the net. Over.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      contentContainerStyle={styles.messages}
      inverted
      data={entries}
      keyExtractor={(entry) => entry.key}
      onEndReached={() => {
        if (props.hasOlder && !props.loadingOlder) props.onLoadOlder();
      }}
      onEndReachedThreshold={0.3}
      // The footer of an inverted list is its top: the start of the history.
      ListFooterComponent={
        <View style={styles.listEdge}>
          {props.loadingOlder ? (
            <ActivityIndicator />
          ) : (
            !props.hasOlder && <Text variant="meta">Start of the net</Text>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <ChatRow
          entry={item}
          userId={props.userId}
          userCallsign={props.userCallsign}
          onRetry={props.onRetrySend}
          onDiscard={props.onDiscard}
        />
      )}
    />
  );
}
