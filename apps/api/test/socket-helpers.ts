import type { AddressInfo } from 'node:net';

import type { INestApplication } from '@nestjs/common';
import type { ApiError, ClientToServerEvents, ServerToClientEvents } from '@callsign/types';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';

/** A client socket as the apps will type it: `<ListenEvents, EmitEvents>` from the client's side. */
export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** `connect_error` from a refused handshake: `message` is the code, `data` the full `ApiError`. */
export type HandshakeError = Error & { data?: ApiError };

/** Starts the app on a free port (sockets need a real server) and returns its URL. */
export async function listen(app: INestApplication): Promise<string> {
  await app.listen(0);
  const { port } = app.getHttpServer().address() as AddressInfo;
  return `http://localhost:${port}`;
}

/**
 * Opens client sockets and closes them all in one call (`afterEach`), so a failing test never
 * leaves a socket that keeps Jest running.
 */
export class SocketClients {
  private readonly sockets: ClientSocket[] = [];

  constructor(private readonly url: string) {}

  /** Resolves once connected; rejects with the handshake error if the server refuses. */
  connect(auth: Record<string, unknown>): Promise<ClientSocket> {
    const socket: ClientSocket = io(this.url, {
      auth,
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
    });
    this.sockets.push(socket);
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', (error: HandshakeError) => reject(error));
    });
  }

  closeAll(): void {
    for (const socket of this.sockets.splice(0)) socket.close();
  }
}
