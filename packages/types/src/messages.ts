import { z } from 'zod';

import { callsignSchema } from './auth';
import { objectIdSchema, pageSchema } from './common';

export const MESSAGE_CONTENT_MAX = 1000;

/** Message text. Trimmed first, so a message of only spaces is empty and rejected. */
export const messageContentSchema = z.string().trim().min(1).max(MESSAGE_CONTENT_MAX);

/**
 * Payload of the `message:send` socket event. There is no sender field: the API takes the
 * sender from the socket's access token, never from the client.
 */
export const sendMessageRequestSchema = z.object({
  roomId: objectIdSchema,
  content: messageContentSchema,
});

export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>;

export const messageSenderSchema = z.object({
  id: z.string(),
  callsign: callsignSchema,
});

export type MessageSender = z.infer<typeof messageSenderSchema>;

export const messageDtoSchema = z.object({
  id: z.string(),
  roomId: z.string(),
  sender: messageSenderSchema,
  content: messageContentSchema,
  createdAt: z.iso.datetime(),
});

export type MessageDto = z.infer<typeof messageDtoSchema>;

/** `GET /rooms/:id/messages` (query: `pageQuerySchema`). Newest first. */
export const messagePageSchema = pageSchema(messageDtoSchema);
