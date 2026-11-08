import type { Request } from 'express';
import { z } from 'zod';

/**
 * Claims inside the access token. `sub` (subject) is the standard JWT claim for the user id;
 * `sid` is the session (one device), so ending a session can close that device's sockets only.
 */
export const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  callsign: z.string().min(1),
  sid: z.string().min(1),
});

/** The authenticated user, as the guard puts it on the request and the handshake on the socket. */
export interface AuthUser {
  userId: string;
  callsign: string;
  /** The session (device) the access token was issued for. */
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
