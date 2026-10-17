import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * The per-IP request limit, for HTTP only. Global guards also run on socket events, where
 * `ThrottlerGuard` would look for an HTTP request and response that do not exist. Sockets get
 * their own limit per connection instead (`message:send`).
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return context.getType() === 'ws' || super.shouldSkip(context);
  }
}
