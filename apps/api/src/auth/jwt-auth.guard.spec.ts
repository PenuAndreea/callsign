import type { ExecutionContext } from '@nestjs/common';
import { Controller, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiException } from '../common/errors/api.exception';
import type { AuthenticatedRequest, AuthUser } from './auth-user';
import { currentUserFromContext } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { TokensService } from './tokens.service';

@Controller()
class SampleController {
  @Get() locked(): void {}
  @Public() @Get() open(): void {}
}

@Public()
@Controller()
class PublicController {
  @Get() anything(): void {}
}

const authUser: AuthUser = { userId: 'u1', callsign: 'wolf-2' };

function contextFor(
  controller: object,
  handler: string,
  authorization?: string,
): { context: ExecutionContext; request: AuthenticatedRequest } {
  const request = { headers: { authorization } } as AuthenticatedRequest;
  const context = {
    getType: () => 'http',
    getClass: () => controller.constructor,
    getHandler: () => (controller as Record<string, unknown>)[handler],
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  const verifyAccessToken = jest.fn();
  const guard = new JwtAuthGuard(new Reflector(), {
    verifyAccessToken,
  } as unknown as TokensService);

  beforeEach(() => {
    verifyAccessToken.mockReset();
  });

  it('lets @Public() routes and controllers through without a token', async () => {
    await expect(
      guard.canActivate(contextFor(new SampleController(), 'open').context),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contextFor(new PublicController(), 'anything').context),
    ).resolves.toBe(true);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'Basic abc', 'Bearer', 'Bearer a b'])(
    'rejects a missing or malformed header: %p',
    async (header) => {
      const { context } = contextFor(new SampleController(), 'locked', header);
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ApiException);
      expect(verifyAccessToken).not.toHaveBeenCalled();
    },
  );

  it('verifies the bearer token and puts the user on the request', async () => {
    verifyAccessToken.mockResolvedValue(authUser);
    const { context, request } = contextFor(new SampleController(), 'locked', 'Bearer abc.def.ghi');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAccessToken).toHaveBeenCalledWith('abc.def.ghi');
    expect(request.user).toEqual(authUser);
    expect(currentUserFromContext(context)).toEqual(authUser);
  });

  it('lets socket events through: sockets are authenticated at the handshake', async () => {
    const context = { getType: () => 'ws' } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyAccessToken).not.toHaveBeenCalled();
  });

  it('passes on the 401 from an invalid token', async () => {
    const unauthorized = new ApiException(401, 'UNAUTHORIZED', 'Invalid or expired token');
    verifyAccessToken.mockRejectedValue(unauthorized);
    const { context } = contextFor(new SampleController(), 'locked', 'Bearer bad');
    await expect(guard.canActivate(context)).rejects.toBe(unauthorized);
  });
});

describe('currentUserFromContext', () => {
  it('fails loudly when used without authentication', () => {
    const { context } = contextFor(new SampleController(), 'open');
    expect(() => currentUserFromContext(context)).toThrow(/without authentication/);
  });
});
