import { HttpStatus } from '@nestjs/common';

import { ApiException } from '../common/errors/api.exception';

/** 404 for a net that does not exist, or a malformed net id (an id that cannot exist does not exist). */
export function netNotFound(): ApiException {
  return new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Net not found');
}
