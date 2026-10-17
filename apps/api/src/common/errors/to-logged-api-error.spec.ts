import { Logger } from '@nestjs/common';

import { ApiException } from './api.exception';
import { toLoggedApiError } from './to-logged-api-error';

describe('toLoggedApiError', () => {
  const logger = new Logger('test');
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => logError.mockRestore());

  it('maps a client error without logging it', () => {
    const error = new ApiException(403, 'NOT_A_MEMBER', 'Join the net first');
    expect(toLoggedApiError(error, logger)).toEqual({
      statusCode: 403,
      code: 'NOT_A_MEMBER',
      message: 'Join the net first',
    });
    expect(logError).not.toHaveBeenCalled();
  });

  it('hides an unexpected error from the client and logs its stack', () => {
    const error = new Error('database exploded');
    expect(toLoggedApiError(error, logger)).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('database exploded'));
  });
});
