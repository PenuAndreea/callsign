import type { InfiniteData } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

import { netKeys } from '../nets/netKeys';

/** Pages of history kept per net on disk: the newest ones, enough to open a chat offline. */
export const PERSISTED_MESSAGE_PAGES = 2;

const MESSAGES = netKeys.messages('')[1];

function isInfiniteData(value: unknown): value is InfiniteData<unknown, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const { pages, pageParams } = value as Partial<InfiniteData<unknown, unknown>>;
  return Array.isArray(pages) && Array.isArray(pageParams);
}

/**
 * A saved cache with every net's history cut to its newest `PERSISTED_MESSAGE_PAGES` pages
 * (newest first, so the first ones). Scrolling up after a restore loads older pages from the
 * API as usual: the last kept page still has its `nextCursor`.
 */
export function trimForDisk(client: PersistedClient): PersistedClient {
  const queries = client.clientState.queries.map((query) => {
    const { data } = query.state;
    if (query.queryKey[1] !== MESSAGES || !isInfiniteData(data)) return query;
    if (data.pages.length <= PERSISTED_MESSAGE_PAGES) return query;
    const trimmed: InfiniteData<unknown, unknown> = {
      pages: data.pages.slice(0, PERSISTED_MESSAGE_PAGES),
      pageParams: data.pageParams.slice(0, PERSISTED_MESSAGE_PAGES),
    };
    return { ...query, state: { ...query.state, data: trimmed } };
  });
  return { ...client, clientState: { ...client.clientState, queries } };
}
