import { HttpStatus, Logger } from '@nestjs/common';
import type { OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import {
  Ack,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { MessageDto, SendMessageAck } from '@callsign/types';
import { sendMessageRequestSchema } from '@callsign/types';

import { TokensService } from '../auth/tokens.service';
import { ApiException } from '../common/errors/api.exception';
import { toLoggedApiError } from '../common/errors/to-logged-api-error';
import { parseOrThrow } from '../common/pipes/zod-validation.pipe';
import { MembershipsService } from '../memberships/memberships.service';
import type { ChatServer, ChatSocket } from '../realtime/chat-server.types';
import { authenticateSocket, joinRoomsOnConnect } from '../realtime/handshake';
import { SlidingWindowLimiter } from '../realtime/sliding-window-limiter';
import { netRoom } from '../realtime/socket-rooms';
import { MessagesService } from './messages.service';

/** `message:send` per socket: 5 messages in any 5 seconds. */
export const SEND_LIMIT = { limit: 5, windowMs: 5000 };

/**
 * Socket.IO entry point, on the API's own port (path `/socket.io`). Clients never join or
 * leave nets over the socket: the handshake puts them in their nets, and REST join/leave
 * moves their sockets.
 */
@WebSocketGateway()
export class MessagesGateway implements OnGatewayInit<ChatServer>, OnGatewayDisconnect<ChatSocket> {
  @WebSocketServer()
  readonly server!: ChatServer;

  private readonly logger = new Logger(MessagesGateway.name);
  private readonly sendLimiter = new SlidingWindowLimiter(SEND_LIMIT);

  constructor(
    private readonly tokens: TokensService,
    private readonly memberships: MembershipsService,
    private readonly messages: MessagesService,
  ) {}

  /** Handshake middleware runs in order, before a socket counts as connected. */
  afterInit(server: ChatServer): void {
    server.use(authenticateSocket(this.tokens));
    server.use(joinRoomsOnConnect(this.memberships));
  }

  handleDisconnect(socket: ChatSocket): void {
    this.sendLimiter.forget(socket.id);
  }

  /**
   * limit → validate → save (membership checked in the service) → ack the sender → broadcast
   * `message:new` to the net, sender included. The ack comes first, so the sender's pending
   * bubble resolves before the broadcast copy arrives (the client deduplicates by `id`).
   * Every failure is an `{ ok: false, error }` ack with the same `ApiError` as REST.
   */
  @SubscribeMessage('message:send')
  async send(
    @ConnectedSocket() socket: ChatSocket,
    @MessageBody() payload: unknown,
    @Ack() ack: ((res: SendMessageAck) => void) | undefined,
  ): Promise<void> {
    let message: MessageDto;
    try {
      if (!this.sendLimiter.tryConsume(socket.id)) {
        throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, 'RATE_LIMITED', 'Too many messages');
      }
      const request = parseOrThrow(sendMessageRequestSchema, payload);
      message = await this.messages.send(socket.data.user, request);
    } catch (error) {
      ack?.({ ok: false, error: toLoggedApiError(error, this.logger) });
      return;
    }
    // Saved: from here on the send has succeeded, whatever happens to the broadcast.
    ack?.({ ok: true, message });
    this.server.to(netRoom(message.roomId)).emit('message:new', message);
  }
}
