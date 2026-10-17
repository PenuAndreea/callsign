import { z } from 'zod';

/**
 * Every environment variable the API reads. Validated once at startup, so a missing
 * or malformed value stops the app before it serves a request.
 * Keep in sync with `.env.example`.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  MONGODB_URI: z
    .string()
    .regex(/^mongodb(\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  /** Origin of the web app, for CORS with credentials. */
  WEB_ORIGIN: z.url(),
  /** HMAC key for access tokens. 32+ characters so it cannot be brute-forced offline. */
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  /**
   * Seconds after a rotation in which the previous refresh token still refreshes instead of
   * counting as stolen (a client that lost the response, or two tabs at once). 0 turns it off.
   */
  REFRESH_REUSE_GRACE_SECONDS: z.coerce.number().int().min(0).max(60).default(10),
  /** Secure by default; set `false` only for http://localhost (Safari drops secure cookies there). */
  COOKIE_SECURE: z.stringbool().default(true),
});

export type Env = z.infer<typeof envSchema>;
