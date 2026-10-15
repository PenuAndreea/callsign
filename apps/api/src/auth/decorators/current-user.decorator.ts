import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';

import type { AuthenticatedRequest, AuthUser } from '../auth-user';

/** Exported for tests; use the decorator in controllers. */
export function currentUserFromContext(context: ExecutionContext): AuthUser {
  const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!user) {
    // Only reachable on a `@Public()` route: a programming error, so a 500 is right.
    throw new Error('@CurrentUser() used on a route without authentication');
  }
  return user;
}

/** The user the guard authenticated: `me(@CurrentUser() user: AuthUser)`. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  currentUserFromContext(context),
);
