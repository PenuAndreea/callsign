import type { Page, RoomDto } from '@callsign/types';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { netKeys } from './netKeys';

type NetPages = InfiniteData<Page<RoomDto>>;

/**
 * Applies `update` to one net wherever it is cached: both list sections and its detail. Pages
 * without that net keep their identity, so only screens showing it re-render.
 */
export function updateNetInCaches(
  queryClient: QueryClient,
  id: string,
  update: (net: RoomDto) => RoomDto,
): void {
  queryClient.setQueriesData<NetPages>({ queryKey: netKeys.lists() }, (data) => {
    if (!data?.pages.some((page) => page.items.some((net) => net.id === id))) return data;
    return {
      ...data,
      pages: data.pages.map((page) =>
        page.items.some((net) => net.id === id)
          ? { ...page, items: page.items.map((net) => (net.id === id ? update(net) : net)) }
          : page,
      ),
    };
  });
  queryClient.setQueryData<RoomDto>(netKeys.detail(id), (net) => net && update(net));
}
