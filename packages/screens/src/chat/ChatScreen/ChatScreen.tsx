import {
  isApiClientError,
  useJoinNet,
  useLeaveNet,
  useNet,
  useNetMessages,
  useRealtimeStatus,
  useSendMessage,
  useSignedInUser,
} from '@callsign/hooks';
import { spacing } from '@callsign/theme';
import { MESSAGE_CONTENT_MAX } from '@callsign/types';
import { Button, MessageInput, ScreenHeader } from '@callsign/ui';
import type { ChatEntry } from '@callsign/hooks';
import { useRef, useState } from 'react';
import type { FlatList } from 'react-native';

import { stationsLabel } from '../../format/stations';
import { KeyboardFrame } from '../../layout/KeyboardFrame';
import { useInsetPadding } from '../../layout/useInsetPadding';
import { ChatBody } from './ChatBody';
import { useChatStyles } from './ChatScreen.styles';
import type { ChatScreenProps } from './ChatScreen.types';

/**
 * One net: header (back, name, member count, Leave), the traffic, and the composer. Sends show
 * at once as pending; live messages from other stations arrive through the socket.
 */
export function ChatScreen({ netId, onBack, onLeft }: ChatScreenProps) {
  const styles = useChatStyles();
  const user = useSignedInUser();
  const netQuery = useNet(netId);
  const net = netQuery.data;
  const chat = useNetMessages(netId);
  const { send, retry, discard } = useSendMessage(netId);
  const join = useJoinNet();
  const leave = useLeaveNet();
  const realtime = useRealtimeStatus();
  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatEntry>>(null);
  const headerPadding = useInsetPadding({ top: spacing.xl });
  // The composer sheet runs under the home indicator; its field stays above it.
  const composerPadding = useInsetPadding({ bottom: spacing.xl });

  const offAir = isApiClientError(netQuery.error, 'NOT_FOUND');
  const notMember = isApiClientError(chat.error, 'NOT_A_MEMBER');
  const live = realtime === 'connected' ? '' : ' · reconnecting';

  return (
    <KeyboardFrame style={styles.screen}>
      <ScreenHeader
        style={[styles.header, headerPadding]}
        {...(onBack && { onBack })}
        eyebrow="Net"
        title={net?.name ?? ''}
        {...(net && { subtitle: `${stationsLabel(net.memberCount)} on net${live}` })}
        truncateTitle
        action={
          !notMember &&
          net !== undefined && (
            <Button
              label="Leave"
              variant="link"
              loading={leave.isPending}
              onPress={() => leave.mutate(netId, { onSuccess: onLeft })}
            />
          )
        }
      />
      <ChatBody
        listRef={listRef}
        entries={chat.entries}
        isPending={chat.isPending}
        offAir={offAir}
        netLoading={netQuery.isPending}
        error={chat.error}
        hasOlder={chat.hasNextPage}
        loadingOlder={chat.isFetchingNextPage}
        onLoadOlder={() => void chat.fetchNextPage()}
        onRetryLoad={() => void chat.refetch()}
        onJoin={() => join.mutate(netId, { onSuccess: () => void chat.refetch() })}
        joining={join.isPending}
        userId={user.id}
        userCallsign={user.callsign}
        onRetrySend={retry}
        onDiscard={discard}
      />
      <MessageInput
        value={draft}
        onChangeText={setDraft}
        onSend={(text) => {
          send(text);
          setDraft('');
          // Back to the newest message, even when reading older traffic.
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }}
        disabled={notMember || net === undefined}
        maxLength={MESSAGE_CONTENT_MAX}
        style={composerPadding}
      />
    </KeyboardFrame>
  );
}
