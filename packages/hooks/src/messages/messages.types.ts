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
  status: 'sending' | 'failed';
  /** Why the last attempt failed (`RATE_LIMITED`, `NOT_A_MEMBER`, `NETWORK_ERROR` for a timeout). */
  error: ClientErrorCode | null;
}

/** One row of a chat, newest first: a saved message or a pending one. */
export type ChatEntry =
  | { type: 'message'; key: string; message: MessageDto }
  | { type: 'pending'; key: string; pending: PendingMessage };
