import type { ChatEntry } from '@callsign/hooks';
import { isApiClientError } from '@callsign/hooks';
import { Button, Text } from '@callsign/ui';
import type { RefObject } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { errorMessage, errorMessageForCode } from '../../errors/errorMessage';
import { ChatNotice } from './ChatNotice';
import { ChatRow } from './ChatRow';
import { useChatStyles } from './ChatScreen.styles';

export interface ChatBodyProps {
  entries: ChatEntry[];
  /** For scrolling to the newest message (offset 0 of the inverted list) after a send. */
  listRef: RefObject<FlatList<ChatEntry> | null>;
  isPending: boolean;
  /** The net does not exist (its own fetch said `NOT_FOUND`). */
  offAir: boolean;
  /** The net itself is still loading (nothing from a list to show yet). */
  netLoading: boolean;
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
 * or the first load, the empty net, a failed load, the offer to join, or a net that is off the air.
 */
// `listRef` apart from `props`: the React Compiler treats an object holding a ref as a ref.
export function ChatBody({ listRef, ...props }: ChatBodyProps) {
  const styles = useChatStyles();
  const { entries, error } = props;
  const notMember = isApiClientError(error, 'NOT_A_MEMBER');

  // First: the history says NOT_A_MEMBER for a net that does not exist too.
  if (props.offAir)
    return <ChatNotice message={errorMessageForCode('NOT_FOUND')} tone="textMuted" />;
  // Wait for the net before offering to join it: it may turn out to be off the air.
  if (props.isPending || (notMember && props.netLoading)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (notMember) {
    return (
      <ChatNotice message="You are not on this net. Join to read the traffic and transmit.">
        <Button label="Join the net" loading={props.joining} onPress={props.onJoin} />
      </ChatNotice>
    );
  }
  if (error && entries.length === 0) {
    return (
      <ChatNotice message={errorMessage(error)} tone="dangerText" alert>
        <Button label="Try again" variant="link" onPress={props.onRetryLoad} />
      </ChatNotice>
    );
  }
  // Outside the list: an inverted list would show its empty component upside down.
  if (entries.length === 0) {
    return <ChatNotice message="No traffic yet. Open the net. Over." tone="textMuted" />;
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
