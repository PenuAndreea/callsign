import type { ClientToServerEvents, ServerToClientEvents } from '@callsign/types';
import type { ManagerOptions, Socket, SocketOptions } from 'socket.io-client';

/**
 * The app's socket, typed once. Socket.IO's generics are `<Listen, Emit>` from the holder's side,
 * so the client listens to the server's events and emits the client's (`io()` is not generic).
 */
export type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Options the realtime layer passes; a factory adds its own (transports, URL). */
export type RealtimeSocketOptions = Pick<
  Partial<ManagerOptions & SocketOptions>,
  'auth' | 'autoConnect'
>;

/** Creates a socket that has not connected yet (`autoConnect: false` is always passed). */
export type SocketFactory = (options: RealtimeSocketOptions) => RealtimeSocket;

/**
 * - `disconnected`: no session, or the socket gave up until its next retry.
 * - `connecting`: first connect, or a reconnect after the connection dropped.
 * - `connected`: events arrive; the socket is in all of the user's nets.
 */
export type RealtimeStatus = 'disconnected' | 'connecting' | 'connected';
