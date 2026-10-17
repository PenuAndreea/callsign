import { Injectable } from '@nestjs/common';
import type { MessageDto, RoomUpdatedEvent } from '@callsign/types';

import type { ChatServer } from './chat-server.types';
import { netRoom, userRoom } from './socket-rooms';

/**
 * Everything the rest of the API does to sockets, in one place. Holds the Socket.IO server,
 * which the gateway hands over in `afterInit`, so services can move sockets and emit without
 * depending on the gateway (no module cycle: Messages → Rooms → Realtime).
 *
 * Before `attach` there is no server and so no sockets: every method is then a no-op.
 */
@Injectable()
export class RealtimeService {
  private server: ChatServer | undefined;

  attach(server: ChatServer): void {
    this.server = server;
  }

  /** Every socket of the user (all devices) starts receiving the net's events. */
  joinUserToNet(userId: string, roomId: string): void {
    this.server?.in(userRoom(userId)).socketsJoin(netRoom(roomId));
  }

  /** Every socket of the user stops receiving the net's events. */
  removeUserFromNet(userId: string, roomId: string): void {
    this.server?.in(userRoom(userId)).socketsLeave(netRoom(roomId));
  }

  /** `message:new` to every socket in the net, the sender's included. */
  broadcastMessage(message: MessageDto): void {
    this.server?.to(netRoom(message.roomId)).emit('message:new', message);
  }

  /** `room:updated` to every socket in the net. */
  broadcastRoomUpdate(room: RoomUpdatedEvent): void {
    this.server?.to(netRoom(room.id)).emit('room:updated', room);
  }
}
