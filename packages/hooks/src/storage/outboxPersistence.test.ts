import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PendingMessage } from '../messages/messages.types';
import { createPendingStore } from '../messages/pendingStore';
import { MemoryOfflineStorage } from '../test/fixtures';
import { createOutboxPersistence, OUTBOX_PREFIX } from './outboxPersistence';

const message = (id: string, overrides: Partial<PendingMessage> = {}): PendingMessage => ({
  clientMessageId: `c0ffee00-0000-4000-8000-00000000000${id}`,
  roomId: 'tower',
  content: `Message ${id}. Over.`,
  createdAt: `2026-10-17T22:1${id}:00.000Z`,
  status: 'queued',
  error: null,
  ...overrides,
});

const keyOf = (pending: PendingMessage) => OUTBOX_PREFIX + pending.clientMessageId;

let stops: (() => void)[] = [];
afterEach(() => {
  for (const stop of stops) stop();
  stops = [];
});

function setup(storage = new MemoryOfflineStorage()) {
  const pending = createPendingStore();
  const reportError = vi.fn();
  const outbox = createOutboxPersistence({ pending, storage, reportError });
  const start = () => stops.push(outbox.start());
  return { pending, storage, reportError, outbox, start };
}

/** What storage holds for one message, parsed. */
const savedAs = (storage: MemoryOfflineStorage, pending: PendingMessage) => {
  const raw = storage.items.get(keyOf(pending));
  return raw === undefined ? undefined : (JSON.parse(raw) as PendingMessage);
};

describe('createOutboxPersistence', () => {
  it('saves each pending message under its own key, and removes it once gone', async () => {
    const { pending, storage, start, outbox } = setup();
    start();
    await outbox.restore();

    const first = message('1');
    pending.add(first);
    await vi.waitFor(() => expect(savedAs(storage, first)).toEqual(first));

    pending.update(first.clientMessageId, { status: 'failed', error: 'NOT_A_MEMBER' });
    await vi.waitFor(() =>
      expect(savedAs(storage, first)).toMatchObject({ status: 'failed', error: 'NOT_A_MEMBER' }),
    );

    pending.remove(first.clientMessageId);
    await vi.waitFor(() => expect(storage.items.has(keyOf(first))).toBe(false));
  });

  it('never leaves a stale write after a quick queued, sending, sent', async () => {
    const { pending, storage, start, outbox } = setup();
    // A slow write (mobile: setItem waits for the key) must not land after the removal.
    const setItem = storage.setItem.bind(storage);
    vi.spyOn(storage, 'setItem').mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      await setItem(key, value);
    });
    start();
    await outbox.restore();

    const sent = message('1');
    pending.add(sent);
    pending.update(sent.clientMessageId, { status: 'sending' });
    pending.remove(sent.clientMessageId);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(storage.items.size).toBe(0);
  });

  it('restores saved messages oldest first, a message cut off mid-send as queued', async () => {
    const storage = new MemoryOfflineStorage();
    const older = message('1', { status: 'sending' });
    const newer = message('2');
    const failed = message('3', { status: 'failed', error: 'NOT_A_MEMBER' });
    for (const saved of [newer, failed, older])
      storage.items.set(keyOf(saved), JSON.stringify(saved));
    const { pending, outbox } = setup(storage);

    await outbox.restore();
    expect(pending.list('tower')).toEqual([failed, newer, { ...older, status: 'queued' }]);
    expect(pending.nextQueued()).toEqual({ ...older, status: 'queued' });
  });

  it('restores once, and saves nothing back that was only restored', async () => {
    const storage = new MemoryOfflineStorage();
    const saved = message('1');
    storage.items.set(keyOf(saved), JSON.stringify(saved));
    const { pending, outbox, start } = setup(storage);
    const setItem = vi.spyOn(storage, 'setItem');

    start();
    await Promise.all([outbox.restore(), outbox.restore()]);
    expect(pending.all()).toHaveLength(1);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('drops a saved message that does not parse, and keeps other keys alone', async () => {
    const storage = new MemoryOfflineStorage();
    storage.items.set(`${OUTBOX_PREFIX}broken`, JSON.stringify({ content: 'no id' }));
    storage.items.set('query-cache', 'not an outbox entry');
    const { pending, outbox } = setup(storage);

    await outbox.restore();
    expect(pending.all()).toEqual([]);
    expect([...storage.items.keys()]).toEqual(['query-cache']);
  });

  it('reports a failed write and keeps working', async () => {
    const { pending, storage, reportError, start, outbox } = setup();
    const failure = new Error('disk full');
    vi.spyOn(storage, 'setItem').mockRejectedValueOnce(failure);
    start();
    await outbox.restore();

    const first = message('1');
    const second = message('2');
    pending.add(first);
    pending.add(second);
    await vi.waitFor(() => expect(savedAs(storage, second)).toEqual(second));
    expect(reportError).toHaveBeenCalledWith(failure, { source: 'storage', key: ['outbox'] });
  });

  it('does nothing without a storage', async () => {
    const pending = createPendingStore();
    const outbox = createOutboxPersistence({ pending, storage: undefined, reportError: vi.fn() });
    await expect(outbox.restore()).resolves.toBeUndefined();
    outbox.start()();
  });
});
