import type { ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type {
  ThrottlerLimitDetail,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { InjectThrottlerOptions, InjectThrottlerStorage, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import { clientIpOf } from '../../auth/decorators/client-ip.decorator';
import { SecurityLog } from '../security/security-log.service';

/**
 * The per-IP request limit, for HTTP only. Global guards also run on socket events, where
 * `ThrottlerGuard` would look for an HTTP request and response that do not exist. Sockets get
 * their own limit per connection instead (`message:send`).
 * Every refused request goes to the security log: on the auth routes it is the clearest sign of
 * passphrase guessing.
 */
@Injectable()
export class HttpThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly securityLog: SecurityLog,
  ) {
    super(options, storage, reflector);
  }

  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    return context.getType() === 'ws' || super.shouldSkip(context);
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<Request>();
    this.securityLog.record({
      event: 'rate_limited',
      method: req.method,
      // The route pattern (`/api/rooms/:id`), not the URL: ids and query strings stay out.
      route: `${req.baseUrl}${(req.route as { path?: string } | undefined)?.path ?? req.path}`,
      ip: clientIpOf(req),
    });
    return super.throwThrottlingException(context, detail);
  }
}
