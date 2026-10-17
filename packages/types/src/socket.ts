import { z } from 'zod';

import { apiErrorSchema } from './common';
import type { MessageDto, SendMessageRequest } from './messages';
import { messageDtoSchema } from './messages';

/** Ack of `message:send`: the saved message, or why it was refused (same `ApiError` as REST). */
export const sendMessageAckSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), message: messageDtoSchema }),
  z.object({ ok: z.literal(false), error: apiErrorSchema }),
]);

export type SendMessageAck = z.infer<typeof sendMessageAckSchema>;

/** `room:updated`: sent to a net's sockets when someone joins or leaves it. */
export const roomUpdatedEventSchema = z.object({
  id: z.string(),
  memberCount: z.number().int().min(0),
});

export type RoomUpdatedEvent = z.infer<typeof roomUpdatedEventSchema>;

/**
 * Events a client may emit. Socket.IO's generics are `<ListenEvents, EmitEvents>` from the side
 * that holds them: `Socket<ServerToClientEvents, ClientToServerEvents>` in the apps,
 * `Server<ClientToServerEvents, ServerToClientEvents>` in the API. The API still parses every
 * payload: types are not checks.
 */
export interface ClientToServerEvents {
  'message:send': (payload: SendMessageRequest, ack: (res: SendMessageAck) => void) => void;
}

/** Events the API emits. Join and leave go over REST; the API moves sockets between nets itself. */
export interface ServerToClientEvents {
  /** To every socket in the net, the sender included (the client deduplicates by `id`). */
  'message:new': (message: MessageDto) => void;
  'room:updated': (room: RoomUpdatedEvent) => void;
}
