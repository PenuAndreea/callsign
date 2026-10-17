import type { PendingMessage } from './messages.types';

const NONE: readonly PendingMessage[] = [];

export interface PendingStore {
  /** Newest first. The same array until this net's pending messages change (for React). */
  list(roomId: string): readonly PendingMessage[];
  subscribe(listener: () => void): () => void;
  get(clientMessageId: string): PendingMessage | undefined;
  add(message: PendingMessage): void;
  update(clientMessageId: string, patch: Partial<PendingMessage>): void;
  remove(clientMessageId: string): void;
  /** Sign-out: nothing of the previous user stays. */
  clear(): void;
}

/**
 * Sends the API has not confirmed, per net. Kept out of the query cache on purpose: a refetch
 * (the catch-up after a reconnect) replaces cached pages and would drop a bubble mid-send.
 */
export function createPendingStore(): PendingStore {
  const listeners = new Set<() => void>();
  let byRoom = new Map<string, readonly PendingMessage[]>();

  function find(clientMessageId: string): PendingMessage | undefined {
    for (const messages of byRoom.values()) {
      const found = messages.find((message) => message.clientMessageId === clientMessageId);
      if (found) return found;
    }
    return undefined;
  }

  function setRoom(roomId: string, messages: readonly PendingMessage[]): void {
    byRoom = new Map(byRoom);
    if (messages.length === 0) byRoom.delete(roomId);
    else byRoom.set(roomId, messages);
    for (const listener of listeners) listener();
  }

  return {
    list: (roomId) => byRoom.get(roomId) ?? NONE,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get: find,
    add(message) {
      setRoom(message.roomId, [message, ...(byRoom.get(message.roomId) ?? NONE)]);
    },
    update(clientMessageId, patch) {
      const current = find(clientMessageId);
      if (!current) return;
      const room = byRoom.get(current.roomId) ?? NONE;
      setRoom(
        current.roomId,
        room.map((message) =>
          message.clientMessageId === clientMessageId ? { ...message, ...patch } : message,
        ),
      );
    },
    remove(clientMessageId) {
      const current = find(clientMessageId);
      if (!current) return;
      const room = byRoom.get(current.roomId) ?? NONE;
      setRoom(
        current.roomId,
        room.filter((message) => message.clientMessageId !== clientMessageId),
      );
    },
    clear() {
      if (byRoom.size === 0) return;
      byRoom = new Map();
      for (const listener of listeners) listener();
    },
  };
}
