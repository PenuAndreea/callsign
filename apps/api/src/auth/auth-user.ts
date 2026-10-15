import type { Request } from 'express';
import { z } from 'zod';

/** Claims inside the access token. `sub` (subject) is the standard JWT claim for the user id. */
export const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  callsign: z.string().min(1),
});

/** The authenticated user, as the guard puts it on the request (and the socket, in M4). */
export interface AuthUser {
  userId: string;
  callsign: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
