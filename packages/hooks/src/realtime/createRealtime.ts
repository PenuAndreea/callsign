import { messageDtoSchema, roomUpdatedEventSchema } from '@callsign/types';
import type { QueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

import { ApiClientError } from '../api/ApiClientError';
import type { ApiClient } from '../api/createApiClient';
import type { ErrorReporter } from '../errors/reportError';
import { consoleErrorReporter } from '../errors/reportError';
import type { PendingStore } from '../messages/pendingStore';
import { createPendingStore } from '../messages/pendingStore';
import { newClientMessageId } from '../messages/newClientMessageId';
import { transmit } from '../messages/transmit';
import { netKeys } from '../nets/netKeys';
import type { SessionStore } from '../session/sessionStore';
import { applyNewMessage, applyRoomUpdate } from './liveCache';
import type { RealtimeSocket, RealtimeStatus, SocketFactory } from './realtime.types';

/** After a refused handshake that a refresh cannot fix (or the server failing), try again later. */
export const RETRY_DELAY_MS = 5000;
/** Handshakes refused right after a fresh token: more means something else is wrong. */
const MAX_AUTH_RETRIES = 2;

export interface RealtimeOptions {
  api: ApiClient;
  queryClient: QueryClient;
  session: SessionStore;
  /** `null`: realtime off. */
  createSocket: SocketFactory | null;
  /** Where broken acks and events go. Omitted: the console. */
  reportError?: ErrorReporter;
}

export interface Realtime {
  getStatus(): RealtimeStatus;
  subscribe(listener: () => void): () => void;
  /** Follows the session: one socket while signed in, none otherwise. Returns the cleanup. */
  start(): () => void;
  /** The open socket (`null` while signed out). */
  getSocket(): RealtimeSocket | null;
  /** This device's unconfirmed sends. */
  pending: PendingStore;
  /** Shows the message as pending at once and sends it with a new idempotency key. */
  send(roomId: string, content: string): Promise<void>;
  /** Sends a failed message again with the same key (never saved twice). */
  retry(clientMessageId: string): Promise<void>;
  /** Drops a failed message from the screen. */
  discard(clientMessageId: string): void;
}

/**
 * The socket of a signed-in session. Plain TS like the session store; the provider starts it.
 * - The handshake reads the access token at each (re)connect, so a reconnect sends the newest.
 * - A refused handshake (`UNAUTHORIZED`, the token expired while offline) refreshes through the
 *   API client's shared refresh and connects again; a refresh that ends the session signs out,
 *   which closes the socket. Socket.IO does not retry refused handshakes by itself.
 * - Socket.IO does not replay missed events: every (re)connect marks nets data fetched before it
 *   as stale, so screens refetch what they show.
 */
export function createRealtime({
  api,
  queryClient,
  session,
  createSocket,
  reportError = consoleErrorReporter,
}: RealtimeOptions): Realtime {
  const listeners = new Set<() => void>();
  let status: RealtimeStatus = 'disconnected';
  let socket: RealtimeSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let authRetries = 0;
  const pending = createPendingStore();

  function setStatus(next: RealtimeStatus): void {
    if (next === status) return;
    status = next;
    for (const listener of listeners) listener();
  }

  function retryLater(current: RealtimeSocket): void {
    setStatus('disconnected');
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (socket === current) current.connect();
    }, RETRY_DELAY_MS);
  }

  function onConnect(): void {
    authRetries = 0;
    setStatus('connected');
    const connectedAt = Date.now();
    // In-flight first fetches count as fresh; data from before this connection may miss events.
    void queryClient.invalidateQueries({
      queryKey: netKeys.all,
      predicate: ({ state }) => state.dataUpdatedAt !== 0 && state.dataUpdatedAt < connectedAt,
    });
  }

  function onConnectError(current: RealtimeSocket, error: Error): void {
    // A transport failure (API down, offline): Socket.IO keeps retrying with backoff.
    if (current.active) return setStatus('connecting');
    // Refused by the handshake middleware: Socket.IO stops, so the next move is ours.
    if (error.message !== 'UNAUTHORIZED' || authRetries >= MAX_AUTH_RETRIES) {
      return retryLater(current);
    }
    authRetries += 1;
    setStatus('connecting');
    api.refresh().then(
      // `null`: the session is over; the session store signs out and `close()` follows.
      (auth) => {
        if (auth !== null && socket === current) current.connect();
      },
      () => retryLater(current),
    );
  }

  /**
   * A live event checked against its schema, like every HTTP response. One that does not match
   * (contract drift) is reported and dropped instead of corrupting the cache.
   */
  function parseEvent<T>(event: string, schema: z.ZodType<T>, raw: unknown): T | null {
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data;
    const error = new ApiClientError(200, 'INVALID_RESPONSE', `Invalid ${event} event`, {
      cause: parsed.error,
    });
    reportError(error, { source: 'realtime', key: [event] });
    return null;
  }

  function open(factory: SocketFactory): void {
    if (socket) return;
    const current = factory({
      auth: (send) => send({ token: api.getAccessToken() ?? '' }),
      autoConnect: false,
    });
    current.on('connect', onConnect);
    current.on('disconnect', () => setStatus(current.active ? 'connecting' : 'disconnected'));
    current.on('connect_error', (error) => onConnectError(current, error));
    current.on('message:new', (raw) => {
      const message = parseEvent('message:new', messageDtoSchema, raw);
      if (!message) return;
      applyNewMessage(queryClient, message);
      // The broadcast of our own send can arrive when the ack was lost (timeout).
      if (message.clientMessageId !== undefined) pending.remove(message.clientMessageId);
    });
    current.on('room:updated', (raw) => {
      const room = parseEvent('room:updated', roomUpdatedEventSchema, raw);
      if (room) applyRoomUpdate(queryClient, room);
    });
    socket = current;
    setStatus('connecting');
    current.connect();
  }

  function close(): void {
    clearTimeout(retryTimer);
    socket?.removeAllListeners();
    socket?.disconnect();
    socket = null;
    authRetries = 0;
    pending.clear();
    setStatus('disconnected');
  }

  return {
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (createSocket === null) return () => undefined;
      const factory = createSocket;
      // A new user gets a new socket: sign-out closes it before the next sign-in opens one.
      const follow = () => (session.getSnapshot().status === 'signedIn' ? open(factory) : close());
      const unsubscribe = session.subscribe(follow);
      follow();
      return () => {
        unsubscribe();
        close();
      };
    },
    getSocket: () => socket,
    pending,
    send(roomId, content) {
      const message = {
        clientMessageId: newClientMessageId(),
        roomId,
        content,
        createdAt: new Date().toISOString(),
        status: 'sending',
        error: null,
      } as const;
      pending.add(message);
      return transmit(socket, queryClient, pending, message, reportError);
    },
    retry(clientMessageId) {
      const message = pending.get(clientMessageId);
      return message
        ? transmit(socket, queryClient, pending, message, reportError)
        : Promise.resolve();
    },
    discard: (clientMessageId) => pending.remove(clientMessageId),
  };
}
