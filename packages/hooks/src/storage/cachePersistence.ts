import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Query, QueryClient } from '@tanstack/react-query';
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
} from '@tanstack/react-query-persist-client';

import type { ErrorReporter } from '../errors/reportError';
import { netKeys } from '../nets/netKeys';
import type { OfflineStorage } from '../platform/platform.types';
import { trimForDisk } from './trimForDisk';

/** Bump when a saved shape changes (a DTO, a query key): older saves are dropped, not read. */
export const CACHE_VERSION = '1';
/** A cache older than this is dropped on start: a week-old nets list helps nobody. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** The storage key of the saved cache. */
export const CACHE_KEY = 'query-cache';
/** At most one save per second, however many live messages arrive. */
const SAVE_THROTTLE_MS = 1000;

export interface CachePersistence {
  /** Loads the saved cache into the query client, once (later calls share it). Never rejects. */
  restore(): Promise<void>;
  /** Saves the cache on every change, after the restore. Returns the cleanup. */
  start(): () => void;
}

interface CachePersistenceOptions {
  queryClient: QueryClient;
  /** Omitted: nothing is saved or restored. */
  storage: OfflineStorage | undefined;
  reportError: ErrorReporter;
}

/** Only nets data (lists, details, histories), and only what loaded. */
function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success' && query.queryKey[0] === netKeys.all[0];
}

/**
 * The query cache saved to the device, so nets and recent history open without a network.
 * - Saves only nets queries, with each history cut to its newest pages (`trimForDisk`).
 * - Restores before saving starts, so an empty cache never overwrites the saved one.
 * - Never saves mutations: a paused join or create is not resumed after a restart.
 * - A failed save or restore is reported (`source: 'storage'`); the app works on without it.
 *   A restore that fails, is older than `CACHE_MAX_AGE_MS` or has another `CACHE_VERSION` is
 *   discarded. Saved data is not parsed again: the version is what guards its shape.
 */
export function createCachePersistence({
  queryClient,
  storage,
  reportError,
}: CachePersistenceOptions): CachePersistence {
  if (storage === undefined) {
    return { restore: () => Promise.resolve(), start: () => () => undefined };
  }

  const persister = createAsyncStoragePersister({
    storage,
    key: CACHE_KEY,
    throttleTime: SAVE_THROTTLE_MS,
    serialize: (client) => JSON.stringify(trimForDisk(client)),
    retry: ({ error }) => {
      reportError(error, { source: 'storage', key: ['save'] });
      return undefined;
    },
  });
  let restored: Promise<void> | null = null;

  function restore(): Promise<void> {
    restored ??= persistQueryClientRestore({
      queryClient,
      persister,
      maxAge: CACHE_MAX_AGE_MS,
      buster: CACHE_VERSION,
    }).catch((error: unknown) => reportError(error, { source: 'storage', key: ['restore'] }));
    return restored;
  }

  return {
    restore,
    start() {
      let stopped = false;
      let unsubscribe: () => void = () => undefined;
      void restore().then(() => {
        if (stopped) return;
        unsubscribe = persistQueryClientSubscribe({
          queryClient,
          persister,
          buster: CACHE_VERSION,
          dehydrateOptions: {
            shouldDehydrateQuery: shouldPersistQuery,
            shouldDehydrateMutation: () => false,
          },
        });
      });
      return () => {
        stopped = true;
        unsubscribe();
      };
    },
  };
}
