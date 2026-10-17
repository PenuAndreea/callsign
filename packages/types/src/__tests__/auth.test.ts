import { describe, expect, it } from 'vitest';

import {
  authResponseSchema,
  callsignSchema,
  clientTypeSchema,
  loginRequestSchema,
  passphraseSchema,
  refreshRequestSchema,
  registerFormSchema,
  registerRequestSchema,
  userDtoSchema,
} from '../auth';

describe('callsignSchema', () => {
  it('trims and lowercases the callsign', () => {
    expect(callsignSchema.parse('  WOLF-2 ')).toBe('wolf-2');
  });

  it('accepts 3 and 20 characters', () => {
    expect(callsignSchema.safeParse('abc').success).toBe(true);
    expect(callsignSchema.safeParse('a'.repeat(20)).success).toBe(true);
  });

  it('rejects fewer than 3 or more than 20 characters', () => {
    expect(callsignSchema.safeParse('ab').success).toBe(false);
    expect(callsignSchema.safeParse('a'.repeat(21)).success).toBe(false);
  });

  it('checks the length after trimming', () => {
    expect(callsignSchema.safeParse('  ab  ').success).toBe(false);
  });
});

describe('passphraseSchema', () => {
  it('accepts 8 and 128 characters', () => {
    expect(passphraseSchema.safeParse('a'.repeat(8)).success).toBe(true);
    expect(passphraseSchema.safeParse('a'.repeat(128)).success).toBe(true);
  });

  it('rejects 7 or 129 characters', () => {
    expect(passphraseSchema.safeParse('a'.repeat(7)).success).toBe(false);
    expect(passphraseSchema.safeParse('a'.repeat(129)).success).toBe(false);
  });

  it('keeps surrounding spaces', () => {
    expect(passphraseSchema.parse('  secret12  ')).toBe('  secret12  ');
  });
});

describe('clientTypeSchema', () => {
  it('accepts web and mobile only', () => {
    expect(clientTypeSchema.safeParse('web').success).toBe(true);
    expect(clientTypeSchema.safeParse('mobile').success).toBe(true);
    expect(clientTypeSchema.safeParse('desktop').success).toBe(false);
  });
});

describe('registerRequestSchema', () => {
  it('normalizes the callsign', () => {
    const parsed = registerRequestSchema.parse({ callsign: ' WOLF-2 ', passphrase: 'secret12' });
    expect(parsed).toEqual({ callsign: 'wolf-2', passphrase: 'secret12' });
  });

  it('enforces the passphrase policy', () => {
    const result = registerRequestSchema.safeParse({ callsign: 'wolf-2', passphrase: 'short' });
    expect(result.success).toBe(false);
  });
});

describe('loginRequestSchema', () => {
  it('accepts a passphrase shorter than the register policy', () => {
    const result = loginRequestSchema.safeParse({ callsign: 'wolf-2', passphrase: 'abc' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty or oversized passphrase', () => {
    expect(loginRequestSchema.safeParse({ callsign: 'wolf-2', passphrase: '' }).success).toBe(
      false,
    );
    expect(
      loginRequestSchema.safeParse({ callsign: 'wolf-2', passphrase: 'a'.repeat(129) }).success,
    ).toBe(false);
  });

  it('lowercases the callsign', () => {
    expect(loginRequestSchema.parse({ callsign: 'WOLF-2', passphrase: 'x' }).callsign).toBe(
      'wolf-2',
    );
  });
});

describe('refreshRequestSchema', () => {
  it('accepts an empty body (web) and a token in the body (mobile)', () => {
    expect(refreshRequestSchema.safeParse({}).success).toBe(true);
    expect(refreshRequestSchema.safeParse({ refreshToken: 'abc' }).success).toBe(true);
  });

  it('rejects an empty token', () => {
    expect(refreshRequestSchema.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});

describe('userDtoSchema', () => {
  const user = {
    id: '6650c0ffee0000000000abcd',
    callsign: 'wolf-2',
    createdAt: '2026-10-15T22:14:00.000Z',
  };

  it('accepts a valid user', () => {
    expect(userDtoSchema.parse(user)).toEqual(user);
  });

  it('rejects a non-ISO createdAt', () => {
    expect(userDtoSchema.safeParse({ ...user, createdAt: '15/10/2026' }).success).toBe(false);
  });
});

describe('authResponseSchema', () => {
  const user = {
    id: '6650c0ffee0000000000abcd',
    callsign: 'wolf-2',
    createdAt: '2026-10-15T22:14:00.000Z',
  };

  it('accepts a response with and without a refresh token', () => {
    expect(authResponseSchema.safeParse({ user, accessToken: 'jwt' }).success).toBe(true);
    expect(
      authResponseSchema.safeParse({ user, accessToken: 'jwt', refreshToken: 'opaque' }).success,
    ).toBe(true);
  });
});

describe('registerFormSchema', () => {
  const values = { callsign: 'wolf-2', passphrase: 'secret12' };

  it('passes when the passphrases match', () => {
    expect(registerFormSchema.safeParse({ ...values, confirmPassphrase: 'secret12' }).success).toBe(
      true,
    );
  });

  it('reports a mismatch on the confirm field', () => {
    const result = registerFormSchema.safeParse({ ...values, confirmPassphrase: 'secret13' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['confirmPassphrase']);
  });
});

describe('field messages (shown under form fields)', () => {
  const firstMessage = (result: { error?: { issues: { message: string }[] } }) =>
    result.error?.issues[0]?.message;

  it('gives the callsign length rule', () => {
    expect(firstMessage(callsignSchema.safeParse('ab'))).toBe('At least 3 characters');
    expect(firstMessage(callsignSchema.safeParse('a'.repeat(21)))).toBe('At most 20 characters');
  });

  it('gives the passphrase rules for register and login', () => {
    expect(firstMessage(passphraseSchema.safeParse('short'))).toBe('At least 8 characters');
    const login = loginRequestSchema.safeParse({ callsign: 'wolf-2', passphrase: '' });
    expect(firstMessage(login)).toBe('Enter your passphrase');
  });
});
