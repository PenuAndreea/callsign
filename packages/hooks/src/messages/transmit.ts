import { sendMessageAckSchema } from '@callsign/types';
import type { QueryClient } from '@tanstack/react-query';

import type { ClientErrorCode } from '../api/ApiClientError';
import type { RealtimeSocket } from '../realtime/realtime.types';
import { insertMessage } from './messageCache';
import type { PendingMessage } from './messages.types';
import type { PendingStore } from './pendingStore';

/** How long a send waits for its ack before it shows as not sent (it may still have arrived). */
export const ACK_TIMEOUT_MS = 10_000;

/**
 * One attempt of a pending message over the socket. The ack's message goes into the history
 * cache and the pending entry goes away; a refusal or a timeout marks it failed. A timeout does
 * not prove it was not saved, which is why a retry reuses the same `clientMessageId`.
 * Without a socket (signed out) it fails at once; while reconnecting, Socket.IO buffers the emit.
 */
export async function transmit(
  socket: RealtimeSocket | null,
  queryClient: QueryClient,
  pending: PendingStore,
  { clientMessageId, roomId, content }: PendingMessage,
): Promise<void> {
  const fail = (error: ClientErrorCode) =>
    pending.update(clientMessageId, { status: 'failed', error });
  pending.update(clientMessageId, { status: 'sending', error: null });
  if (!socket) return fail('NETWORK_ERROR');

  let raw: unknown;
  try {
    raw = await socket
      .timeout(ACK_TIMEOUT_MS)
      .emitWithAck('message:send', { roomId, content, clientMessageId });
  } catch {
    return fail('NETWORK_ERROR');
  }
  const ack = sendMessageAckSchema.safeParse(raw);
  if (!ack.success) return fail('INVALID_RESPONSE');
  if (!ack.data.ok) return fail(ack.data.error.code);
  insertMessage(queryClient, ack.data.message);
  pending.remove(clientMessageId);
}
