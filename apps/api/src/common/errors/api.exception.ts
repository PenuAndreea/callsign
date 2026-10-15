import { HttpException } from '@nestjs/common';
import type { ApiError, ErrorCode } from '@callsign/types';

/**
 * The one exception services throw for expected failures: it carries the stable `code`
 * from the shared contract, e.g. `throw new ApiException(409, 'CALLSIGN_TAKEN', 'Callsign taken')`.
 */
export class ApiException extends HttpException {
  constructor(statusCode: number, code: ErrorCode, message: string) {
    const body: ApiError = { statusCode, code, message };
    super(body, statusCode);
  }
}
