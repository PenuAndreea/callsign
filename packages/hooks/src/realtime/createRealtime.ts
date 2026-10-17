import type { QueryClient } from '@tanstack/react-query';

import type { ApiClient } from '../api/createApiClient';
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
}

export interface Realtime {
  getStatus(): RealtimeStatus;
  subscribe(listener: () => void): () => void;
  /** Follows the session: one socket while signed in, none otherwise. Returns the cleanup. */
  start(): () => void;
  /** The open socket, for sending (`null` while signed out). */
  getSocket(): RealtimeSocket | null;
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
}: RealtimeOptions): Realtime {
  const listeners = new Set<() => void>();
  let status: RealtimeStatus = 'disconnected';
  let socket: RealtimeSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let authRetries = 0;

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

  function open(factory: SocketFactory): void {
    if (socket) return;
    const current = factory({
      auth: (send) => send({ token: api.getAccessToken() ?? '' }),
      autoConnect: false,
    });
    current.on('connect', onConnect);
    current.on('disconnect', () => setStatus(current.active ? 'connecting' : 'disconnected'));
    current.on('connect_error', (error) => onConnectError(current, error));
    current.on('message:new', (message) => applyNewMessage(queryClient, message));
    current.on('room:updated', (room) => applyRoomUpdate(queryClient, room));
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
  };
}
