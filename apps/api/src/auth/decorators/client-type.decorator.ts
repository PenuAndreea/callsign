import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import { clientTypeSchema } from '@callsign/types';
import type { Request } from 'express';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

/**
 * Raw `X-Client` header value (Express lowercases header names). A custom param decorator
 * because Nest's built-in `@Headers()` takes no pipes; ones made with `createParamDecorator`
 * do, and Nest runs them on the value this factory returns.
 */
const XClientHeader = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<Request>().headers['x-client'],
);

/**
 * `X-Client: web | mobile`, validated (400 on anything else). Missing means web: the safe
 * default keeps the refresh token in the httpOnly cookie, out of the body.
 * Bundles the header and its pipe so routes just write `@Client() client: ClientType`.
 * (Not named `ClientType`: that name is already the type from `@callsign/types`.)
 */
export const Client = () => XClientHeader(new ZodValidationPipe(clientTypeSchema.default('web')));
