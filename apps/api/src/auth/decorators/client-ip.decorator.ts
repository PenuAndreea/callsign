import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';

/** Express's `req.ip` (also what the rate limiter keys on), or `unknown` when the socket is gone. */
export function clientIpOf(req: Request): string {
  return req.ip ?? 'unknown';
}

/**
 * The caller's IP, for the security log. Behind a reverse proxy it is the proxy's IP until
 * `trust proxy` is set (see `configure-app.ts`).
 */
export const ClientIp = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  clientIpOf(context.switchToHttp().getRequest<Request>()),
);
