import type { Page, RoomDto } from '@callsign/types';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { netKeys } from './netKeys';

export interface ListedNet {
  net: RoomDto;
  /** When the list holding it was fetched, so the copy goes stale with that list. */
  updatedAt: number;
}

/** A net already loaded in either section, so its screen can show it before its own fetch. */
export function findNetInLists(queryClient: QueryClient, id: string): ListedNet | undefined {
  const lists = queryClient.getQueriesData<InfiniteData<Page<RoomDto>>>({
    queryKey: netKeys.lists(),
  });
  for (const [queryKey, data] of lists) {
    for (const page of data?.pages ?? []) {
      const net = page.items.find((item) => item.id === id);
      if (net) return { net, updatedAt: queryClient.getQueryState(queryKey)?.dataUpdatedAt ?? 0 };
    }
  }
  return undefined;
}
