import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { MemoryOfflineStorage, wolf } from '../test/fixtures';
import { createPendingStore } from '../messages/pendingStore';
import { createCachePersistence } from './cachePersistence';
import { createOfflineData, USER_KEY } from './offlineData';
import { createOutboxPersistence } from './outboxPersistence';

/** `null`: a platform without offline storage. */
function setup(withStorage: MemoryOfflineStorage | null = new MemoryOfflineStorage()) {
  const storage = withStorage ?? undefined;
  const queryClient = new QueryClient();
  const reportError = vi.fn();
  const persistence = createCachePersistence({ queryClient, storage, reportError });
  const restore = vi.spyOn(persistence, 'restore');
  const outbox = createOutboxPersistence({ pending: createPendingStore(), storage, reportError });
  const restoreOutbox = vi.spyOn(outbox, 'restore');
  const data = createOfflineData({ storage, persistence, outbox, reportError });
  return { data, storage, reportError, restore, restoreOutbox };
}

describe('createOfflineData', () => {
  it('saves the signed-in station and loads it back with the cache', async () => {
    const { data, restore, restoreOutbox } = setup();
    await data.saveUser(wolf);
    await expect(data.load()).resolves.toEqual(wolf);
    expect(restore).toHaveBeenCalledTimes(1);
    expect(restoreOutbox).toHaveBeenCalledTimes(1);
  });

  it('loads no station when none was saved', async () => {
    await expect(setup().data.load()).resolves.toBeNull();
  });

  it('reports a saved station it cannot read, and loads none', async () => {
    const { data, storage, reportError } = setup();
    storage?.items.set(USER_KEY, '{broken');
    await expect(data.load()).resolves.toBeNull();
    expect(reportError).toHaveBeenCalledWith(expect.any(SyntaxError), {
      source: 'storage',
      key: ['user'],
    });
  });

  it('reports a failed save instead of rejecting', async () => {
    const { data, storage, reportError } = setup();
    const failure = new Error('disk full');
    if (storage) vi.spyOn(storage, 'setItem').mockRejectedValueOnce(failure);
    await expect(data.saveUser(wolf)).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(failure, { source: 'storage', key: ['user'] });
  });

  it('wipes the station with everything else', async () => {
    const { data, storage } = setup();
    await data.saveUser(wolf);
    await data.wipe();
    expect(storage?.items.size).toBe(0);
  });

  it('saves and loads nothing without a storage', async () => {
    const { data } = setup(null);
    await data.saveUser(wolf);
    await expect(data.load()).resolves.toBeNull();
  });
});
