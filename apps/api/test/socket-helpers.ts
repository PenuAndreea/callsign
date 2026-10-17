import type { AddressInfo } from 'node:net';

import type { INestApplication } from '@nestjs/common';
import type {
  ApiError,
  ClientToServerEvents,
  MessageDto,
  SendMessageAck,
  SendMessageRequest,
  ServerToClientEvents,
} from '@callsign/types';
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

  /** Opens a socket for a station and waits until it is connected. */
  connectAs(token: string): Promise<ClientSocket> {
    return this.connect({ token });
  }

  closeAll(): void {
    for (const socket of this.sockets.splice(0)) socket.close();
  }
}

/** Emits `message:send` and resolves with the ack (fails the test after 2 s without one). */
export function sendMessage(socket: ClientSocket, payload: unknown): Promise<SendMessageAck> {
  // Payloads in tests are often deliberately invalid, so they are typed `unknown` here.
  return socket.timeout(2000).emitWithAck('message:send', payload as SendMessageRequest);
}

/** Emits with no callback at all, which the typed `emit` does not allow (the ack is required there). */
export function emitWithoutAck(socket: ClientSocket, event: string, payload: unknown): void {
  (socket as unknown as { emit: (event: string, payload: unknown) => void }).emit(event, payload);
}

/** Collects every `message:new` a socket receives, in order. */
export function collectMessages(socket: ClientSocket): MessageDto[] {
  const received: MessageDto[] = [];
  socket.on('message:new', (message) => received.push(message));
  return received;
}

/** Resolves on the next `message:new`. */
export function nextMessage(socket: ClientSocket): Promise<MessageDto> {
  return new Promise((resolve) => socket.once('message:new', resolve));
}

/** Lets in-flight socket events arrive before asserting that something did *not* happen. */
export function settle(ms = 100): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
