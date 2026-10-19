import { afterEach, describe, expect, it, vi } from 'vitest';

import { newClientMessageId } from './newClientMessageId';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe('newClientMessageId', () => {
  it('returns a v4 UUID', () => {
    expect(newClientMessageId()).toMatch(UUID_V4);
  });

  it('falls back without crypto.randomUUID (some React Native engines)', () => {
    vi.stubGlobal('crypto', {});
    const ids = new Set(Array.from({ length: 50 }, () => newClientMessageId()));
    expect([...ids].every((id) => UUID_V4.test(id))).toBe(true);
    expect(ids.size).toBe(50);
  });
});
