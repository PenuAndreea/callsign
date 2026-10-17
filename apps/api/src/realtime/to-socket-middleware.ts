import { Logger } from '@nestjs/common';
import type { ExtendedError } from 'socket.io';

import { toApiError } from '../common/errors/to-api-error';
import type { ChatMiddleware, ChatSocket } from './chat-server.types';

const logger = new Logger('SocketHandshake');

/**
 * Wraps an async handshake step as a Socket.IO middleware. A thrown error refuses the
 * connection: the client gets `connect_error` with the error code as `message` and the full
 * `ApiError` as `data`, mapped exactly like an HTTP error (unknown errors become a generic
 * `INTERNAL_ERROR`, details only in the server log).
 */
export function toSocketMiddleware(step: (socket: ChatSocket) => Promise<void>): ChatMiddleware {
  return (socket, next) => {
    step(socket).then(
      () => next(),
      (error: unknown) => {
        const apiError = toApiError(error);
        if (apiError.statusCode >= 500) {
          logger.error(error instanceof Error ? (error.stack ?? error.message) : error);
        }
        const refusal: ExtendedError = Object.assign(new Error(apiError.code), { data: apiError });
        next(refusal);
      },
    );
  };
}
