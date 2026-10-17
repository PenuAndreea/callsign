import type { Page, RoomDto, RoomScope } from '@callsign/types';
import { roomPageSchema } from '@callsign/types';
import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useApiClient } from '../provider/useApiClient';
import { netKeys } from './netKeys';

type NetPages = InfiniteData<Page<RoomDto>, string | undefined>;

/**
 * One section of the nets screen (`joined` or `open`), sorted by name, page by page.
 * `data` is the flat list of nets loaded so far; `fetchNextPage` loads the next page.
 */
export function useNets(scope: RoomScope) {
  const api = useApiClient();
  return useInfiniteQuery({
    queryKey: netKeys.list(scope),
    queryFn: ({ pageParam }) =>
      api.request(
        { method: 'GET', path: '/rooms', query: { scope, cursor: pageParam } },
        roomPageSchema,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    select: (data: NetPages) => data.pages.flatMap((page) => page.items),
  });
}
