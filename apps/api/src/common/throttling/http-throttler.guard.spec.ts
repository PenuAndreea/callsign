import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ThrottlerLimitDetail, ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerException } from '@nestjs/throttler';

import type { SecurityLog } from '../security/security-log.service';
import { HttpThrottlerGuard } from './http-throttler.guard';

/** Exposes the protected hooks under test. */
class TestableGuard extends HttpThrottlerGuard {
  skip(context: ExecutionContext): Promise<boolean> {
    return this.shouldSkip(context);
  }

  refuse(context: ExecutionContext): Promise<void> {
    return this.throwThrottlingException(context, {} as ThrottlerLimitDetail);
  }
}

const contextOf = (type: string) => ({ getType: () => type }) as unknown as ExecutionContext;

const httpContextOf = (req: object) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req }),
  }) as unknown as ExecutionContext;

describe('HttpThrottlerGuard', () => {
  const securityLog = { record: jest.fn() };
  const guard = new TestableGuard(
    { throttlers: [{ ttl: 60_000, limit: 100 }] },
    {} as ThrottlerStorage,
    new Reflector(),
    securityLog as unknown as SecurityLog,
  );

  beforeEach(() => jest.clearAllMocks());

  it('skips socket events', async () => {
    await expect(guard.skip(contextOf('ws'))).resolves.toBe(true);
  });

  it('throttles HTTP requests', async () => {
    await expect(guard.skip(contextOf('http'))).resolves.toBe(false);
  });

  it('logs a refused request by route pattern, then refuses it with 429', async () => {
    const req = {
      method: 'GET',
      baseUrl: '/api/rooms',
      route: { path: '/:id/messages' },
      path: '/6ae0a169a13cd1a437034abf/messages',
      ip: '203.0.113.7',
    };

    await expect(guard.refuse(httpContextOf(req))).rejects.toBeInstanceOf(ThrottlerException);

    expect(securityLog.record).toHaveBeenCalledWith({
      event: 'rate_limited',
      method: 'GET',
      route: '/api/rooms/:id/messages',
      ip: '203.0.113.7',
    });
  });
});
