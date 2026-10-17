import type { ClientToServerEvents, ServerToClientEvents } from '@callsign/types';
import type { ExtendedError, Server, Socket } from 'socket.io';

import type { AuthUser } from '../auth/auth-user';

/** Per-socket data, set by `authenticateSocket` during the handshake. */
export interface SocketData {
  user: AuthUser;
}

/** No events between API instances: there is one instance. */
type InterServerEvents = Record<string, never>;

/**
 * The typed Socket.IO server. The generics are `<ListenEvents, EmitEvents>` from the API's side;
 * use these aliases instead of writing them again, so they cannot end up swapped.
 */
export type ChatServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type ChatSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/** A handshake middleware (`server.use`). */
export type ChatMiddleware = (socket: ChatSocket, next: (err?: ExtendedError) => void) => void;
