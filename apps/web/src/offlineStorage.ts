import type { OfflineStorage } from '@callsign/hooks';
import type { UseStore } from 'idb-keyval';
import { clear, createStore, del, get, keys, set } from 'idb-keyval';

/** One database for the app's offline data, so a sign-out can empty it in one go. */
const DB_NAME = 'callsign-offline';
const STORE_NAME = 'items';

/**
 * Offline data in IndexedDB (asynchronous, large quota, unlike `localStorage`). Not encrypted: a
 * browser has no key store that the page's own scripts cannot read, so a key would sit next to
 * the data it protects. The data is wiped on every sign-in and sign-out instead (see
 * `docs/security.md`, M9). The database opens on first use, not on import.
 */
export function createIndexedDbStorage(
  store: UseStore = createStore(DB_NAME, STORE_NAME),
): OfflineStorage {
  return {
    getItem: async (key) => {
      const value = await get<unknown>(key, store);
      return typeof value === 'string' ? value : null;
    },
    setItem: (key, value) => set(key, value, store),
    removeItem: (key) => del(key, store),
    // Only string keys are ours: IndexedDB also allows numbers, dates and arrays.
    keys: async () => (await keys(store)).filter((key): key is string => typeof key === 'string'),
    clear: () => clear(store),
  };
}
