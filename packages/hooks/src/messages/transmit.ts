import { sendMessageAckSchema } from '@callsign/types';
import type { QueryClient } from '@tanstack/react-query';

import type { ClientErrorCode } from '../api/ApiClientError';
import { ApiClientError } from '../api/ApiClientError';
import type { ErrorReporter } from '../errors/reportError';
import { isUnexpectedError } from '../errors/reportError';
import type { RealtimeSocket } from '../realtime/realtime.types';
import { insertMessage } from './messageCache';
import type { PendingMessage } from './messages.types';
import type { PendingStore } from './pendingStore';

/** How long a send waits for its ack before it shows as not sent (it may still have arrived). */
export const ACK_TIMEOUT_MS = 10_000;

const SEND_EVENT = ['message:send'] as const;

/**
 * What became of one attempt, for the outbox to decide what comes next:
 * - `sent`: saved; it is in the history and no longer pending.
 * - `requeued`: the connection dropped before the ack; back to `queued` for the next connect.
 * - `rateLimited`: the API asked to slow down; back to `queued`, try again later.
 * - `failed`: refused, or no ack while still connected; waits for Retry or Discard.
 */
export type TransmitOutcome = 'sent' | 'requeued' | 'rateLimited' | 'failed';

/**
 * One attempt of a pending message over a connected socket. The ack's message goes into the
 * history cache and the pending entry goes away. A timeout does not prove it was not saved,
 * which is why every attempt reuses the same `clientMessageId` (the API never saves it twice).
 * An ack that breaks the contract, or a server failure, is also reported.
 */
export async function transmit(
  socket: RealtimeSocket,
  queryClient: QueryClient,
  pending: PendingStore,
  { clientMessageId, roomId, content }: PendingMessage,
  reportError: ErrorReporter,
): Promise<TransmitOutcome> {
  const fail = (error: ClientErrorCode): TransmitOutcome => {
    pending.update(clientMessageId, { status: 'failed', error });
    return 'failed';
  };
  const requeue = (outcome: TransmitOutcome): TransmitOutcome => {
    pending.update(clientMessageId, { status: 'queued', error: null });
    return outcome;
  };
  pending.update(clientMessageId, { status: 'sending', error: null });

  let raw: unknown;
  try {
    raw = await socket
      .timeout(ACK_TIMEOUT_MS)
      .emitWithAck('message:send', { roomId, content, clientMessageId });
  } catch {
    // Disconnected meanwhile: send it again after the reconnect. Still connected: something is
    // wrong on the way or on the server, so show it instead of retrying forever.
    return socket.connected ? fail('NETWORK_ERROR') : requeue('requeued');
  }
  const ack = sendMessageAckSchema.safeParse(raw);
  if (!ack.success) {
    const error = new ApiClientError(200, 'INVALID_RESPONSE', 'Invalid message:send ack', {
      cause: ack.error,
    });
    reportError(error, { source: 'realtime', key: SEND_EVENT });
    return fail(error.code);
  }
  if (!ack.data.ok) {
    const { statusCode, code, message } = ack.data.error;
    if (code === 'RATE_LIMITED') return requeue('rateLimited');
    const error = new ApiClientError(statusCode, code, message);
    if (isUnexpectedError(error)) reportError(error, { source: 'realtime', key: SEND_EVENT });
    return fail(code);
  }
  insertMessage(queryClient, ack.data.message);
  pending.remove(clientMessageId);
  return 'sent';
}
