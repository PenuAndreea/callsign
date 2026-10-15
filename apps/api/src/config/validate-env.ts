import { z } from 'zod';

import type { Env } from './env.schema';
import { envSchema } from './env.schema';

/**
 * `ConfigModule` validator: returns the parsed (coerced, defaulted) env or throws.
 * The error lists variable names and rules only, never the values, so secrets stay out of logs.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
