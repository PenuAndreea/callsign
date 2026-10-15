import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { clientTypeSchema } from '@callsign/types';
import type { Request } from 'express';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

const XClientHeader = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<Request>().headers['x-client'],
);

/**
 * `X-Client: web | mobile`, validated (400 on anything else). Missing means web: the safe
 * default keeps the refresh token in the httpOnly cookie, out of the body.
 */
export const Client = () => XClientHeader(new ZodValidationPipe(clientTypeSchema.default('web')));
