import type { Page, RoomDto } from '@callsign/types';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { netKeys } from './netKeys';

/** A net already loaded in either section, so its screen can show it before its own fetch. */
export function findNetInLists(queryClient: QueryClient, id: string): RoomDto | undefined {
  const lists = queryClient.getQueriesData<InfiniteData<Page<RoomDto>>>({
    queryKey: netKeys.lists(),
  });
  for (const [, data] of lists) {
    for (const page of data?.pages ?? []) {
      const net = page.items.find((item) => item.id === id);
      if (net) return net;
    }
  }
  return undefined;
}
