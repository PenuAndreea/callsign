import { z } from 'zod';

import { pageQuerySchema, pageSchema } from './common';

/** Net name. Stored lowercase so uniqueness is case-insensitive; the UI uppercases it. */
export const roomNameSchema = z.string().trim().toLowerCase().min(3).max(30);

export const createRoomRequestSchema = z.object({
  name: roomNameSchema,
});

export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;

/** Nets list sections: the user's nets, or the ones they can join. */
export const roomScopeSchema = z.enum(['joined', 'open']);

export type RoomScope = z.infer<typeof roomScopeSchema>;

/** `GET /rooms?scope&cursor&limit`. `scope` is required: the nets screen asks for each section. */
export const roomsQuerySchema = pageQuerySchema.extend({
  scope: roomScopeSchema,
});

export type RoomsQuery = z.infer<typeof roomsQuerySchema>;

export type RoomsQueryInput = z.input<typeof roomsQuerySchema>;

/** Preview of the newest message, for the nets list. `content` is cut short by the API. */
export const roomLastMessageSchema = z.object({
  content: z.string(),
  createdAt: z.iso.datetime(),
});

export type RoomLastMessage = z.infer<typeof roomLastMessageSchema>;

export const roomDtoSchema = z.object({
  id: z.string(),
  name: roomNameSchema,
  memberCount: z.number().int().min(0),
  /** Relative to the user making the request. */
  isMember: z.boolean(),
  lastMessage: roomLastMessageSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export type RoomDto = z.infer<typeof roomDtoSchema>;

export const roomPageSchema = pageSchema(roomDtoSchema);
