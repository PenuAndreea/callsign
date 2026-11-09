import { describe, expect, it, vi } from 'vitest';

import { MemoryOfflineStorage } from '../test/fixtures';
import { clearOfflineStorage } from './clearOfflineStorage';

describe('clearOfflineStorage', () => {
  it('empties the storage', async () => {
    const storage = new MemoryOfflineStorage();
    await storage.setItem('cache', 'nets');
    await clearOfflineStorage(storage, vi.fn());
    expect(await storage.getItem('cache')).toBeNull();
  });

  it('does nothing without a storage', async () => {
    await expect(clearOfflineStorage(undefined, vi.fn())).resolves.toBeUndefined();
  });

  it('reports a failure instead of rejecting', async () => {
    const storage = new MemoryOfflineStorage();
    const failure = new Error('disk full');
    vi.spyOn(storage, 'clear').mockRejectedValue(failure);
    const reportError = vi.fn();

    await expect(clearOfflineStorage(storage, reportError)).resolves.toBeUndefined();
    expect(reportError).toHaveBeenCalledWith(failure, { source: 'storage', key: ['clear'] });
  });
});
