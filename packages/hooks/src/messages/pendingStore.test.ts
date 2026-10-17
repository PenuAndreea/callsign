import { describe, expect, it, vi } from 'vitest';

import type { PendingMessage } from './messages.types';
import { createPendingStore } from './pendingStore';

const pending = (clientMessageId: string, roomId = 'tower'): PendingMessage => ({
  clientMessageId,
  roomId,
  content: 'Over.',
  createdAt: '2026-10-17T22:14:00.000Z',
  status: 'sending',
  error: null,
});

describe('createPendingStore', () => {
  it('lists a net newest first and keeps nets apart', () => {
    const store = createPendingStore();
    store.add(pending('a'));
    store.add(pending('b'));
    store.add(pending('c', 'ground'));

    expect(store.list('tower').map((message) => message.clientMessageId)).toEqual(['b', 'a']);
    expect(store.list('ground')).toHaveLength(1);
  });

  it('keeps the same array until that net changes (stable for React)', () => {
    const store = createPendingStore();
    store.add(pending('a'));
    const before = store.list('tower');
    store.add(pending('c', 'ground'));
    expect(store.list('tower')).toBe(before);
    expect(store.list('empty')).toBe(store.list('other-empty'));
  });

  it('updates, removes and clears, notifying subscribers', () => {
    const store = createPendingStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.add(pending('a'));

    store.update('a', { status: 'failed', error: 'RATE_LIMITED' });
    expect(store.get('a')).toMatchObject({ status: 'failed', error: 'RATE_LIMITED' });
    store.remove('a');
    expect(store.list('tower')).toEqual([]);
    store.add(pending('b'));
    store.clear();
    expect(store.get('b')).toBeUndefined();
    expect(listener).toHaveBeenCalledTimes(5);
  });

  it('ignores unknown ids', () => {
    const store = createPendingStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.update('nope', { status: 'failed' });
    store.remove('nope');
    store.clear();
    expect(listener).not.toHaveBeenCalled();
  });
});
