import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { netKeys } from '../nets/netKeys';
import { MemoryOfflineStorage } from '../test/fixtures';
import type { CachePersistence } from './cachePersistence';
import {
  CACHE_KEY,
  CACHE_MAX_AGE_MS,
  CACHE_VERSION,
  createCachePersistence,
} from './cachePersistence';

const SAVE_DELAY_MS = 1000;
const history = {
  pages: [{ items: ['a'] }, { items: ['b'] }, { items: ['c'] }],
  pageParams: [undefined, 'c1', 'c2'],
};

let stops: (() => void)[] = [];

function setup(storage = new MemoryOfflineStorage()) {
  const queryClient = new QueryClient();
  const reportError = vi.fn();
  const persistence = createCachePersistence({ queryClient, storage, reportError });
  const start = (target: CachePersistence = persistence) => stops.push(target.start());
  return { queryClient, storage, reportError, persistence, start };
}

/** What a save wrote, as the persister reads it back. */
function saved(storage: MemoryOfflineStorage) {
  const raw = storage.items.get(CACHE_KEY);
  return raw === undefined
    ? undefined
    : (JSON.parse(raw) as {
        buster: string;
        clientState: { queries: { queryKey: unknown[]; state: { data: unknown } }[] };
      });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  for (const stop of stops) stop();
  stops = [];
  vi.useRealTimers();
});

describe('createCachePersistence', () => {
  it('saves nets queries (histories cut to their newest pages) and nothing else', async () => {
    const { queryClient, storage, start } = setup();
    start();
    await vi.advanceTimersByTimeAsync(0);

    queryClient.setQueryData(netKeys.detail('n1'), { id: 'n1' });
    queryClient.setQueryData(netKeys.messages('n1'), history);
    queryClient.setQueryData(['session', 'other'], 'not nets');
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);

    const cache = saved(storage);
    expect(cache?.buster).toBe(CACHE_VERSION);
    expect(cache?.clientState.queries.map((query) => query.queryKey)).toEqual([
      netKeys.detail('n1'),
      netKeys.messages('n1'),
    ]);
    // JSON writes the first page's `undefined` cursor as `null`; a refetch reads it as the
    // initial page (`oldPageParams[0] ?? initialPageParam`), later pages come from `nextCursor`.
    expect(cache?.clientState.queries[1]?.state.data).toEqual({
      pages: [{ items: ['a'] }, { items: ['b'] }],
      pageParams: [null, 'c1'],
    });
  });

  it('restores a saved cache into a new client, keeping when it was fetched', async () => {
    const first = setup();
    first.start();
    await vi.advanceTimersByTimeAsync(0);
    first.queryClient.setQueryData(netKeys.detail('n1'), { id: 'n1' });
    const fetchedAt = first.queryClient.getQueryState(netKeys.detail('n1'))?.dataUpdatedAt;
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);

    const second = setup(first.storage);
    await second.persistence.restore();
    expect(second.queryClient.getQueryData(netKeys.detail('n1'))).toEqual({ id: 'n1' });
    expect(second.queryClient.getQueryState(netKeys.detail('n1'))?.dataUpdatedAt).toBe(fetchedAt);
  });

  it('restores once, however often it is asked', async () => {
    const { persistence, storage } = setup();
    const getItem = vi.spyOn(storage, 'getItem');
    await Promise.all([persistence.restore(), persistence.restore()]);
    await persistence.restore();
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it('does not save over the saved cache before restoring it', async () => {
    const first = setup();
    first.start();
    await vi.advanceTimersByTimeAsync(0);
    first.queryClient.setQueryData(netKeys.detail('n1'), { id: 'n1' });
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);

    const second = setup(first.storage);
    second.start();
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    expect(second.queryClient.getQueryData(netKeys.detail('n1'))).toEqual({ id: 'n1' });
    expect(saved(first.storage)?.clientState.queries).toHaveLength(1);
  });

  it.each([
    ['another version', { buster: 'old', timestamp: () => Date.now() }],
    ['too old', { buster: CACHE_VERSION, timestamp: () => Date.now() - CACHE_MAX_AGE_MS - 1 }],
  ])('drops a saved cache of %s', async (_, { buster, timestamp }) => {
    const storage = new MemoryOfflineStorage();
    const clientState = { mutations: [], queries: [] };
    storage.items.set(CACHE_KEY, JSON.stringify({ buster, timestamp: timestamp(), clientState }));

    await setup(storage).persistence.restore();
    expect(storage.items.has(CACHE_KEY)).toBe(false);
  });

  it('reports and drops a saved cache it cannot read', async () => {
    const storage = new MemoryOfflineStorage();
    storage.items.set(CACHE_KEY, '{not json');
    const { persistence, reportError } = setup(storage);

    await expect(persistence.restore()).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(expect.any(SyntaxError), {
      source: 'storage',
      key: ['restore'],
    });
    expect(storage.items.has(CACHE_KEY)).toBe(false);
  });

  it('reports a failed save once and keeps working', async () => {
    const { queryClient, storage, reportError, start } = setup();
    const failure = new Error('disk full');
    vi.spyOn(storage, 'setItem').mockRejectedValueOnce(failure);
    start();
    await vi.advanceTimersByTimeAsync(0);

    queryClient.setQueryData(netKeys.detail('n1'), { id: 'n1' });
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    expect(reportError).toHaveBeenCalledWith(failure, { source: 'storage', key: ['save'] });
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it('stops saving after cleanup', async () => {
    const { queryClient, storage, persistence } = setup();
    const stop = persistence.start();
    await vi.advanceTimersByTimeAsync(0);
    stop();

    queryClient.setQueryData(netKeys.detail('n1'), { id: 'n1' });
    await vi.advanceTimersByTimeAsync(SAVE_DELAY_MS);
    expect(storage.items.has(CACHE_KEY)).toBe(false);
  });

  it('does nothing without a storage', async () => {
    const queryClient = new QueryClient();
    const persistence = createCachePersistence({
      queryClient,
      storage: undefined,
      reportError: vi.fn(),
    });
    await expect(persistence.restore()).resolves.toBeUndefined();
    persistence.start()();
  });
});
