import { Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import type { ExtendedError } from 'socket.io';

import type { AuthUser } from '../auth/auth-user';
import type { TokensService } from '../auth/tokens.service';
import { ApiException } from '../common/errors/api.exception';
import type { MembershipsService } from '../memberships/memberships.service';
import type { ChatMiddleware, ChatSocket } from './chat-server.types';
import { authenticateSocket, joinRoomsOnConnect } from './handshake';

const user: AuthUser = { userId: '6650c0ffee0000000000f00d', callsign: 'wolf-2' };

function fakeSocket(auth: unknown, data: Partial<ChatSocket['data']> = {}) {
  const join = jest.fn<Promise<void>, [string | string[]]>().mockResolvedValue();
  const socket = { handshake: { auth }, data, join } as unknown as ChatSocket;
  return { socket, join };
}

/** Runs a middleware and resolves with what it passed to `next` (undefined = accepted). */
function run(middleware: ChatMiddleware, socket: ChatSocket): Promise<ExtendedError | undefined> {
  return new Promise((resolve) => middleware(socket, resolve));
}

describe('authenticateSocket', () => {
  const verifyAccessToken = jest.fn<Promise<AuthUser>, [string]>();
  const middleware = authenticateSocket({ verifyAccessToken } as unknown as TokensService);

  beforeEach(() => verifyAccessToken.mockReset());

  it('verifies the token and puts the user on the socket', async () => {
    verifyAccessToken.mockResolvedValue(user);
    const { socket } = fakeSocket({ token: 'abc.def.ghi' });
    await expect(run(middleware, socket)).resolves.toBeUndefined();
    expect(verifyAccessToken).toHaveBeenCalledWith('abc.def.ghi');
    expect(socket.data.user).toEqual(user);
  });

  it.each([{}, { token: '' }, { token: 42 }, null])(
    'refuses a missing or malformed token: %p',
    async (auth) => {
      const error = await run(middleware, fakeSocket(auth).socket);
      expect(error?.message).toBe('UNAUTHORIZED');
      expect(error?.data).toEqual({
        statusCode: 401,
        code: 'UNAUTHORIZED',
        message: 'Missing access token',
      });
      expect(verifyAccessToken).not.toHaveBeenCalled();
    },
  );

  it('refuses an invalid or expired token with the 401 from TokensService', async () => {
    verifyAccessToken.mockRejectedValue(
      new ApiException(401, 'UNAUTHORIZED', 'Invalid or expired token'),
    );
    const { socket } = fakeSocket({ token: 'bad' });
    const error = await run(middleware, socket);
    expect(error?.message).toBe('UNAUTHORIZED');
    expect(error?.data).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
    expect(socket.data.user).toBeUndefined();
  });
});

describe('joinRoomsOnConnect', () => {
  const roomIdsFor = jest.fn<Promise<Types.ObjectId[]>, [string]>();
  const middleware = joinRoomsOnConnect({ roomIdsFor } as unknown as MembershipsService);

  beforeEach(() => roomIdsFor.mockReset());

  it('joins the user room first, then every net of the user', async () => {
    const nets = [new Types.ObjectId(), new Types.ObjectId()];
    roomIdsFor.mockResolvedValue(nets);
    const { socket, join } = fakeSocket({}, { user });

    await expect(run(middleware, socket)).resolves.toBeUndefined();
    expect(roomIdsFor).toHaveBeenCalledWith(user.userId);
    expect(join.mock.calls).toEqual([
      [`user:${user.userId}`],
      [nets.map((id) => `room:${id.toHexString()}`)],
    ]);
  });

  it('refuses the connection with a generic 500 when the nets cannot be loaded', async () => {
    const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    roomIdsFor.mockRejectedValue(new Error('connection lost'));

    const error = await run(middleware, fakeSocket({}, { user }).socket);
    expect(error?.message).toBe('INTERNAL_ERROR');
    expect(error?.data).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('connection lost'));
    logError.mockRestore();
  });
});
