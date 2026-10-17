import { HttpStatus } from '@nestjs/common';
import { z } from 'zod';

import type { TokensService } from '../auth/tokens.service';
import { ApiException } from '../common/errors/api.exception';
import type { MembershipsService } from '../memberships/memberships.service';
import type { ChatMiddleware } from './chat-server.types';
import { netRoom, userRoom } from './socket-rooms';
import { toSocketMiddleware } from './to-socket-middleware';

/** `io(url, { auth: { token } })`. Browsers cannot set headers on a WebSocket, hence `auth`. */
const handshakeAuthSchema = z.object({ token: z.string().min(1) });

/**
 * Checks the access token once, before the connection exists, with the same check as the
 * HTTP guard. A refused handshake never becomes a connected socket. The token is not checked
 * again: an open connection outlives the token's expiry, and the next reconnect needs a fresh one.
 */
export function authenticateSocket(tokens: TokensService): ChatMiddleware {
  return toSocketMiddleware(async (socket) => {
    const auth = handshakeAuthSchema.safeParse(socket.handshake.auth);
    if (!auth.success) {
      throw new ApiException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Missing access token');
    }
    socket.data.user = await tokens.verifyAccessToken(auth.data.token);
  });
}

/**
 * Joins the socket to its user room first, then to every net the user is in. In the handshake,
 * so the rooms are in place before the client sees `connect`. User room first: a REST join
 * that lands while the nets load still reaches this socket through `user:<id>`.
 */
export function joinRoomsOnConnect(memberships: MembershipsService): ChatMiddleware {
  return toSocketMiddleware(async (socket) => {
    const { userId } = socket.data.user;
    await socket.join(userRoom(userId));
    const roomIds = await memberships.roomIdsFor(userId);
    await socket.join(roomIds.map((id) => netRoom(id.toHexString())));
  });
}
