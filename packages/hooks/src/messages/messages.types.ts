import type { ClientErrorCode } from '../api/ApiClientError';
import type { MessageDto } from '@callsign/types';

/** A message this device sent that the API has not confirmed yet. */
export interface PendingMessage {
  /** Idempotency key: the same on every retry, so the API never saves it twice. */
  clientMessageId: string;
  roomId: string;
  content: string;
  /** Local send time, for ordering and the bubble's meta line. */
  createdAt: string;
  /**
   * - `queued`: in the outbox, waiting for its turn or for a connection.
   * - `sending`: on the wire, waiting for the ack.
   * - `failed`: refused or timed out while connected; waits for Retry or Discard.
   */
  status: 'queued' | 'sending' | 'failed';
  /** Why the last attempt failed (`NOT_A_MEMBER`, `NETWORK_ERROR` for a timeout, ...). */
  error: ClientErrorCode | null;
}

/** One row of a chat, newest first: a saved message or a pending one. */
export type ChatEntry =
  | { type: 'message'; key: string; message: MessageDto }
  | { type: 'pending'; key: string; pending: PendingMessage };
