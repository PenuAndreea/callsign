import 'fake-indexeddb/auto';

import { createStore, set } from 'idb-keyval';
import { describe, expect, it } from 'vitest';

import { createIndexedDbStorage } from '../offlineStorage';

let databases = 0;
/** A fresh database per test, so tests never see each other's items. */
const freshStorage = () => {
  const store = createStore(`test-${(databases += 1)}`, 'items');
  return { store, storage: createIndexedDbStorage(store) };
};

describe('createIndexedDbStorage', () => {
  it('saves, reads and removes items', async () => {
    const { storage } = freshStorage();
    expect(await storage.getItem('cache')).toBeNull();

    await storage.setItem('cache', '{"nets":[]}');
    expect(await storage.getItem('cache')).toBe('{"nets":[]}');

    await storage.removeItem('cache');
    expect(await storage.getItem('cache')).toBeNull();
  });

  it('clears every item', async () => {
    const { storage } = freshStorage();
    await storage.setItem('cache', 'nets');
    await storage.setItem('outbox:1', 'message');

    await storage.clear();
    expect(await storage.getItem('cache')).toBeNull();
    expect(await storage.getItem('outbox:1')).toBeNull();
  });

  it('lists its keys', async () => {
    const { store, storage } = freshStorage();
    await storage.setItem('cache', 'nets');
    await storage.setItem('outbox:1', 'message');
    await set(42, 'not ours', store);

    expect((await storage.keys()).sort()).toEqual(['cache', 'outbox:1']);
  });

  it('reads a value that is not a string as missing', async () => {
    const { store, storage } = freshStorage();
    await set('cache', { not: 'a string' }, store);
    expect(await storage.getItem('cache')).toBeNull();
  });
});
