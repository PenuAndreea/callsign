import { describe, expect, it } from 'vitest';

import { createWebPlatform } from '../platform';

describe('createWebPlatform', () => {
  it('talks to the same origin as a web client', () => {
    expect(createWebPlatform(undefined)).toEqual({ apiUrl: '', client: 'web' });
  });

  it('runs exclusive tasks under a Web Lock with the given name', async () => {
    const names: string[] = [];
    const locks = {
      request: (name: string, task: () => Promise<unknown>) => {
        names.push(name);
        return task();
      },
    } as unknown as LockManager;
    const platform = createWebPlatform(locks);

    await expect(platform.runExclusive?.('refresh', () => Promise.resolve(42))).resolves.toBe(42);
    expect(names).toEqual(['refresh']);
  });
});
