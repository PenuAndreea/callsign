import type { PipeTransform } from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import type { z } from 'zod';

import { ApiException } from '../errors/api.exception';

/** `"callsign: Too small: …; passphrase: …"`. Zod messages never include the input, so secrets stay out. */
function formatIssues(error: z.ZodError): string {
  return error.issues
    .map(
      (issue) => (issue.path.length ? `${issue.path.map(String).join('.')}: ` : '') + issue.message,
    )
    .join('; ');
}

/**
 * Validates with a shared schema and returns the *parsed* value (trimmed, lowercased, defaulted),
 * so handlers only ever see normalized data. Usage: `@Body(new ZodValidationPipe(loginRequestSchema))`.
 */
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        formatIssues(result.error),
      );
    }
    return result.data;
  }
}
