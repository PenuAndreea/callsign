import type { QueryClient } from '@tanstack/react-query';

import type { ErrorReporter } from '../errors/reportError';
import type { RealtimeSocket } from '../realtime/realtime.types';
import { newClientMessageId } from './newClientMessageId';
import type { PendingStore } from './pendingStore';
import { transmit } from './transmit';

/** The API's send limit is 5 per 5 s per socket: after a refusal, the window has passed. */
export const RATE_LIMIT_WAIT_MS = 5000;

export interface OutboxOptions {
  pending: PendingStore;
  queryClient: QueryClient;
  /** The current socket; the outbox only sends while it is connected. */
  getSocket: () => RealtimeSocket | null;
  reportError: ErrorReporter;
  /** For tests. */
  rateLimitWaitMs?: number;
}

export interface Outbox {
  /** Queues a new message (shown at once as pending) and sends when it is its turn. */
  send(roomId: string, content: string): void;
  /** Queues a failed message again, with the same idempotency key. */
  retry(clientMessageId: string): void;
  /** Drops a pending message from the screen. */
  discard(clientMessageId: string): void;
  /** Sends what is queued, if connected (called on every connect). */
  flush(): void;
  /** Sign-out: no more sends, no timer left behind. */
  stop(): void;
}

/**
 * Unsent messages, sent one at a time, oldest first, by a single loop. One sender keeps the
 * order (a new message never overtakes an older queued one) and handles the rate limit in one
 * place. The loop runs while the socket is connected and something is queued:
 * - saved: next one;
 * - connection dropped before the ack: stays queued, the next connect flushes it again;
 * - `RATE_LIMITED`: stays queued, the loop pauses for `RATE_LIMIT_WAIT_MS`;
 * - refused (`NOT_A_MEMBER`, ...) or no ack while connected: failed, the loop goes on with the
 *   next one, and that message waits for the user.
 * Nothing is emitted while disconnected, so Socket.IO's in-memory buffer never holds a message.
 */
export function createOutbox({
  pending,
  queryClient,
  getSocket,
  reportError,
  rateLimitWaitMs = RATE_LIMIT_WAIT_MS,
}: OutboxOptions): Outbox {
  let running = false;
  let waitTimer: ReturnType<typeof setTimeout> | undefined;
  /** Bumped by `stop()`: a loop from before it ends at its next step. */
  let generation = 0;
  /** The last queued time handed out: strictly increasing, so the order holds within a ms. */
  let lastQueuedAt = 0;

  async function drain(): Promise<void> {
    if (running || waitTimer !== undefined) return;
    running = true;
    const started = generation;
    try {
      for (;;) {
        const socket = getSocket();
        const next = pending.nextQueued();
        if (!socket?.connected || next === undefined) return;
        const outcome = await transmit(socket, queryClient, pending, next, reportError);
        if (started !== generation) return;
        if (outcome === 'rateLimited') {
          waitTimer = setTimeout(() => {
            waitTimer = undefined;
            flush();
          }, rateLimitWaitMs);
          return;
        }
      }
    } finally {
      running = false;
      // Stopped meanwhile: a flush that came after (the next session's connect) found this
      // loop still running and returned. Pick up for it.
      if (started !== generation) flush();
    }
  }

  function flush(): void {
    void drain();
  }

  return {
    send(roomId, content) {
      lastQueuedAt = Math.max(Date.now(), lastQueuedAt + 1);
      pending.add({
        clientMessageId: newClientMessageId(),
        roomId,
        content,
        createdAt: new Date(lastQueuedAt).toISOString(),
        status: 'queued',
        error: null,
      });
      flush();
    },
    retry(clientMessageId) {
      if (pending.get(clientMessageId)?.status !== 'failed') return;
      pending.update(clientMessageId, { status: 'queued', error: null });
      flush();
    },
    discard: (clientMessageId) => pending.remove(clientMessageId),
    flush,
    stop() {
      generation += 1;
      clearTimeout(waitTimer);
      waitTimer = undefined;
    },
  };
}
