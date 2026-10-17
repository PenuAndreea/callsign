import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { ApiError, ClientToServerEvents, ServerToClientEvents } from '@callsign/types';
import { Server } from 'socket.io';
import type { ExtendedError } from 'socket.io';
import { io } from 'socket.io-client';

import type { RealtimeSocket, SocketFactory } from '../realtime/realtime.types';

export interface SocketTestServer {
  /** Server side, to emit events (`server.io.emit('message:new', ...)`) or drop connections. */
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  /** Tokens the handshake accepts; others are refused with `UNAUTHORIZED`, like the API. */
  validTokens: Set<string>;
  /** Every token a handshake presented, in order. */
  handshakes: string[];
  /** For `ApiPlatform.createSocket`: clients of this server, with fast reconnects. */
  createSocket: SocketFactory;
  /** Drops every connection at the transport level, so clients reconnect by themselves. */
  dropConnections(): void;
  close(): Promise<void>;
}

const unauthorized: ApiError = { statusCode: 401, code: 'UNAUTHORIZED', message: 'Invalid token' };

/** A real Socket.IO server on a free local port with the API's handshake rule. */
export async function startSocketTestServer(validTokens = ['access-1']): Promise<SocketTestServer> {
  const httpServer = createServer();
  const server: Server<ClientToServerEvents, ServerToClientEvents> = new Server(httpServer, {
    serveClient: false,
  });
  const tokens = new Set(validTokens);
  const handshakes: string[] = [];
  server.use((socket, next) => {
    const { token } = socket.handshake.auth as { token?: unknown };
    handshakes.push(String(token));
    if (typeof token === 'string' && tokens.has(token)) return next();
    const error: ExtendedError = Object.assign(new Error('UNAUTHORIZED'), { data: unauthorized });
    next(error);
  });
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(httpServer.address() as AddressInfo).port}`;
  const clients: RealtimeSocket[] = [];

  return {
    io: server,
    validTokens: tokens,
    handshakes,
    createSocket: (options) => {
      const socket: RealtimeSocket = io(url, {
        ...options,
        transports: ['websocket'],
        forceNew: true,
        reconnectionDelay: 20,
        reconnectionDelayMax: 50,
      });
      clients.push(socket);
      return socket;
    },
    dropConnections: () => {
      for (const socket of server.sockets.sockets.values()) socket.conn.close();
    },
    close: async () => {
      for (const socket of clients) socket.disconnect();
      await server.close();
    },
  };
}
