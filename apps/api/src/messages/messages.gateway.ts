import type { OnGatewayInit } from '@nestjs/websockets';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { TokensService } from '../auth/tokens.service';
import { MembershipsService } from '../memberships/memberships.service';
import type { ChatServer } from '../realtime/chat-server.types';
import { authenticateSocket, joinRoomsOnConnect } from '../realtime/handshake';

/**
 * Socket.IO entry point, on the API's own port (path `/socket.io`). Clients never join or
 * leave nets over the socket: the handshake puts them in their nets, and REST join/leave
 * moves their sockets.
 */
@WebSocketGateway()
export class MessagesGateway implements OnGatewayInit<ChatServer> {
  @WebSocketServer()
  readonly server!: ChatServer;

  constructor(
    private readonly tokens: TokensService,
    private readonly memberships: MembershipsService,
  ) {}

  /** Handshake middleware runs in order, before a socket counts as connected. */
  afterInit(server: ChatServer): void {
    server.use(authenticateSocket(this.tokens));
    server.use(joinRoomsOnConnect(this.memberships));
  }
}
