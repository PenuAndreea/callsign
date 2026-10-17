import { useRealtime } from '../realtime/RealtimeContext';

export interface SendMessageActions {
  /** Shows the message at once (pending) and transmits it. Never rejects: failures show on it. */
  send: (content: string) => void;
  /** Sends a failed message again (same idempotency key). */
  retry: (clientMessageId: string) => void;
  /** Removes a failed message. */
  discard: (clientMessageId: string) => void;
}

/** Sending in one net over the socket. The state lives in the pending entries of `useNetMessages`. */
export function useSendMessage(netId: string): SendMessageActions {
  const realtime = useRealtime();
  return {
    send: (content) => void realtime.send(netId, content),
    retry: (clientMessageId) => void realtime.retry(clientMessageId),
    discard: (clientMessageId) => realtime.discard(clientMessageId),
  };
}
