import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, Logger } from '@nestjs/common';
import type { Response } from 'express';

import { toLoggedApiError } from './to-logged-api-error';

/** Global HTTP filter: every error response has the `{ statusCode, code, message }` shape. */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // Full details of unexpected errors go to the server log only.
    const body = toLoggedApiError(exception, this.logger);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
