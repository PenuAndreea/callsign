import { errorCodeSchema } from '@callsign/types';
import { z } from 'zod';

import type { ErrorReporter } from '../errors/reportError';
import type { PendingMessage } from '../messages/messages.types';
import type { PendingStore } from '../messages/pendingStore';
import type { OfflineStorage } from '../platform/platform.types';

/** One storage key per message, so two web tabs never overwrite each other's outbox. */
export const OUTBOX_PREFIX = 'outbox:';

/** A saved message comes from disk: checked like an API response before it is trusted. */
const savedMessageSchema = z.object({
  clientMessageId: z.string().min(1),
  roomId: z.string().min(1),
  content: z.string(),
  createdAt: z.iso.datetime(),
  status: z.enum(['queued', 'sending', 'failed']),
  error: z.union([errorCodeSchema, z.enum(['NETWORK_ERROR', 'INVALID_RESPONSE'])]).nullable(),
});

export interface OutboxPersistence {
  /** Loads the saved messages into the pending store, once (later calls share it). Never rejects. */
  restore(): Promise<void>;
  /** Saves every change of the pending store, after the restore. Returns the cleanup. */
  start(): () => void;
}

interface OutboxPersistenceOptions {
  pending: PendingStore;
  /** Omitted: nothing is saved or restored. */
  storage: OfflineStorage | undefined;
  reportError: ErrorReporter;
}

/**
 * The outbox saved to the device, so unsent messages survive the app being closed.
 * - Restore: every `outbox:` key, parsed; one that does not parse is dropped (and removed). A
 *   message that was `sending` when the app closed comes back `queued`: its ack never arrived, and
 *   the same `clientMessageId` makes the resend safe.
 * - Save: each change of the pending store is diffed against what was saved (new or changed:
 *   write, gone: remove). Writes run one after another in order, so a quick queued, sending, sent
 *   never ends with a stale write after the removal.
 * - Failures are reported (`source: 'storage'`); the outbox works on in memory.
 */
export function createOutboxPersistence({
  pending,
  storage,
  reportError,
}: OutboxPersistenceOptions): OutboxPersistence {
  if (storage === undefined) {
    return { restore: () => Promise.resolve(), start: () => () => undefined };
  }
  const report = (error: unknown) => reportError(error, { source: 'storage', key: ['outbox'] });
  const keyOf = (clientMessageId: string) => OUTBOX_PREFIX + clientMessageId;

  let writes: Promise<void> = Promise.resolve();
  function write(operation: () => Promise<void>): void {
    writes = writes.then(operation).catch(report);
  }

  async function readSaved(key: string): Promise<PendingMessage | null> {
    const raw = await storage?.getItem(key);
    if (raw === null || raw === undefined) return null;
    const parsed = savedMessageSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const message = parsed.data;
    return message.status === 'sending' ? { ...message, status: 'queued' } : message;
  }

  async function load(): Promise<void> {
    const keys = (await storage?.keys())?.filter((key) => key.startsWith(OUTBOX_PREFIX)) ?? [];
    const saved: PendingMessage[] = [];
    for (const key of keys) {
      try {
        const message = await readSaved(key);
        if (message === null) await storage?.removeItem(key);
        else saved.push(message);
      } catch (error) {
        report(error);
      }
    }
    // Oldest first: the store lists each net newest first.
    saved.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const message of saved) {
      if (pending.get(message.clientMessageId) === undefined) pending.add(message);
    }
  }

  let restored: Promise<void> | null = null;
  function restore(): Promise<void> {
    restored ??= load().catch(report);
    return restored;
  }

  return {
    restore,
    start() {
      let stopped = false;
      let unsubscribe: () => void = () => undefined;
      void restore().then(() => {
        if (stopped) return;
        /** What storage holds now, by id: the restored messages are saved already. */
        let saved = new Map(pending.all().map((message) => [message.clientMessageId, message]));
        unsubscribe = pending.subscribe(() => {
          const now = new Map(pending.all().map((message) => [message.clientMessageId, message]));
          for (const [id, message] of now) {
            if (saved.get(id) !== message)
              write(() => storage.setItem(keyOf(id), JSON.stringify(message)));
          }
          for (const id of saved.keys()) {
            if (!now.has(id)) write(() => storage.removeItem(keyOf(id)));
          }
          saved = now;
        });
      });
      return () => {
        stopped = true;
        unsubscribe();
      };
    },
  };
}
