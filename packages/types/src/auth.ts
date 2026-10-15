import { z } from 'zod';

/** Username and display name. Stored lowercase so uniqueness is case-insensitive; the UI uppercases it. */
export const callsignSchema = z.string().trim().toLowerCase().min(3).max(20);

export type Callsign = z.infer<typeof callsignSchema>;

const PASSPHRASE_MAX = 128;

/**
 * Passphrase policy for new accounts. Not trimmed: spaces can be part of the secret.
 * The upper bound rejects huge inputs before argon2 hashes them.
 */
export const passphraseSchema = z.string().min(8).max(PASSPHRASE_MAX);

/** `X-Client` header: decides whether the refresh token travels in a cookie (web) or the body (mobile). */
export const clientTypeSchema = z.enum(['web', 'mobile']);

export type ClientType = z.infer<typeof clientTypeSchema>;

export const registerRequestSchema = z.object({
  callsign: callsignSchema,
  passphrase: passphraseSchema,
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

/** Login checks presence only, so accounts made under an older, looser policy can still sign in. */
export const loginRequestSchema = z.object({
  callsign: callsignSchema,
  passphrase: z.string().min(1).max(PASSPHRASE_MAX),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Web sends `{}` (token in the cookie); mobile sends the token in the body. */
export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export type RefreshRequest = z.infer<typeof refreshRequestSchema>;

export const userDtoSchema = z.object({
  id: z.string(),
  callsign: callsignSchema,
  createdAt: z.iso.datetime(),
});

export type UserDto = z.infer<typeof userDtoSchema>;

export const authResponseSchema = z.object({
  user: userDtoSchema,
  accessToken: z.string(),
  /** Mobile only; web gets it as an httpOnly cookie. */
  refreshToken: z.string().optional(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/** Register form only: the API never receives `confirmPassphrase`. */
export const registerFormSchema = registerRequestSchema
  .extend({ confirmPassphrase: z.string() })
  .refine((values) => values.passphrase === values.confirmPassphrase, {
    path: ['confirmPassphrase'],
    message: 'Passphrases do not match',
  });

export type RegisterFormValues = z.input<typeof registerFormSchema>;
