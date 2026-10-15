import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, Logger } from '@nestjs/common';
import type { Response } from 'express';

import { toApiError } from './to-api-error';

/** Global HTTP filter: every error response has the `{ statusCode, code, message }` shape. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = toApiError(exception);
    if (body.statusCode >= 500) {
      // Full details go to the server log only.
      this.logger.error(
        exception instanceof Error ? (exception.stack ?? exception.message) : exception,
      );
    }
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
