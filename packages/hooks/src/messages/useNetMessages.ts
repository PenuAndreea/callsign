import { messagePageSchema } from '@callsign/types';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useSyncExternalStore } from 'react';

import { useApiClient } from '../provider/useApiClient';
import { netKeys } from '../nets/netKeys';
import { netPath } from '../nets/netPaths';
import { useRealtime } from '../realtime/RealtimeContext';
import type { ChatEntry } from './messages.types';

/**
 * A net's chat, newest first (ready for an inverted list): this device's pending sends, then the
 * saved history page by page (`fetchNextPage` loads older messages). Live messages arrive in the
 * same cache through the socket. Errors: `NOT_A_MEMBER` (join first), `NOT_FOUND`.
 */
export function useNetMessages(netId: string) {
  const api = useApiClient();
  const realtime = useRealtime();
  const history = useInfiniteQuery({
    queryKey: netKeys.messages(netId),
    queryFn: ({ pageParam }) =>
      api.request(
        { method: 'GET', path: `${netPath(netId)}/messages`, query: { cursor: pageParam } },
        messagePageSchema,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
  const pending = useSyncExternalStore(realtime.pending.subscribe, () =>
    realtime.pending.list(netId),
  );

  const entries = useMemo<ChatEntry[]>(() => {
    const saved = history.data?.pages.flatMap((page) => page.items) ?? [];
    return [
      ...pending.map((message) => ({
        type: 'pending' as const,
        key: message.clientMessageId,
        pending: message,
      })),
      ...saved.map((message) => ({ type: 'message' as const, key: message.id, message })),
    ];
  }, [history.data, pending]);

  return { ...history, entries };
}
