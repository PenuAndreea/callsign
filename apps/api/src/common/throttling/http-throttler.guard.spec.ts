import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ThrottlerStorage } from '@nestjs/throttler';

import { HttpThrottlerGuard } from './http-throttler.guard';

/** Exposes the protected hook under test. */
class TestableGuard extends HttpThrottlerGuard {
  skip(context: ExecutionContext): Promise<boolean> {
    return this.shouldSkip(context);
  }
}

const contextOf = (type: string) => ({ getType: () => type }) as unknown as ExecutionContext;

describe('HttpThrottlerGuard', () => {
  const guard = new TestableGuard(
    { throttlers: [{ ttl: 60_000, limit: 100 }] },
    {} as ThrottlerStorage,
    new Reflector(),
  );

  it('skips socket events', async () => {
    await expect(guard.skip(contextOf('ws'))).resolves.toBe(true);
  });

  it('throttles HTTP requests', async () => {
    await expect(guard.skip(contextOf('http'))).resolves.toBe(false);
  });
});
