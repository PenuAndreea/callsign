import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { describe, expect, it } from 'vitest';

import { netKeys } from '../nets/netKeys';
import { PERSISTED_MESSAGE_PAGES, trimForDisk } from './trimForDisk';

function savedClient(queries: { queryKey: readonly unknown[]; data: unknown }[]): PersistedClient {
  return {
    timestamp: 1,
    buster: '1',
    clientState: {
      mutations: [],
      queries: queries.map(({ queryKey, data }) => ({
        queryKey,
        queryHash: JSON.stringify(queryKey),
        dehydratedAt: 1,
        state: {
          data,
          dataUpdateCount: 1,
          dataUpdatedAt: 1,
          error: null,
          errorUpdateCount: 0,
          errorUpdatedAt: 0,
          fetchFailureCount: 0,
          fetchFailureReason: null,
          fetchMeta: null,
          isInvalidated: false,
          status: 'success',
          fetchStatus: 'idle',
        },
      })),
    },
  };
}

const pages = (count: number) => ({
  pages: Array.from({ length: count }, (_, index) => ({ items: [`page ${index}`] })),
  pageParams: Array.from({ length: count }, (_, index) => (index === 0 ? undefined : `c${index}`)),
});

const dataOf = (client: PersistedClient, index: number) =>
  client.clientState.queries[index]?.state.data;

describe('trimForDisk', () => {
  it("keeps a net's newest history pages, with their cursors", () => {
    const trimmed = trimForDisk(
      savedClient([{ queryKey: netKeys.messages('n1'), data: pages(5) }]),
    );
    expect(dataOf(trimmed, 0)).toEqual({
      pages: [{ items: ['page 0'] }, { items: ['page 1'] }],
      pageParams: [undefined, 'c1'],
    });
    expect(PERSISTED_MESSAGE_PAGES).toBe(2);
  });

  it('leaves short histories, nets lists and details as they are', () => {
    const client = savedClient([
      { queryKey: netKeys.messages('n1'), data: pages(1) },
      { queryKey: netKeys.list('joined'), data: pages(4) },
      { queryKey: netKeys.detail('n1'), data: { id: 'n1' } },
    ]);
    const trimmed = trimForDisk(client);
    expect(trimmed.clientState.queries).toEqual(client.clientState.queries);
  });

  it('does not change the cache it was given', () => {
    const client = savedClient([{ queryKey: netKeys.messages('n1'), data: pages(3) }]);
    trimForDisk(client);
    expect(dataOf(client, 0)).toEqual(pages(3));
  });
});
