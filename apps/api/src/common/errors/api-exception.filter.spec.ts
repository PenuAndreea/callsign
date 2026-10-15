import type { ArgumentsHost } from '@nestjs/common';
import { Logger, NotFoundException } from '@nestjs/common';

import { ApiExceptionFilter } from './api-exception.filter';

function createHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('ApiExceptionFilter', () => {
  const filter = new ApiExceptionFilter();
  let logError: jest.SpyInstance;

  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logError.mockRestore();
  });

  it('writes the ApiError body with its status', () => {
    const { host, status, json } = createHost();
    filter.catch(new NotFoundException('Not here'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ statusCode: 404, code: 'NOT_FOUND', message: 'Not here' });
    expect(logError).not.toHaveBeenCalled();
  });

  it('logs server errors but answers with a generic body', () => {
    const { host, status, json } = createHost();
    filter.catch(new Error('boom'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
