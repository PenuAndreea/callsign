import { SCREEN_ASYNC_TIMEOUT_MS } from '@callsign/hooks/testing';
import { getConfig } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('setupScreenTests', () => {
  it('gives async queries more time than the 1 s default (slow CI renders)', () => {
    expect(getConfig().asyncUtilTimeout).toBe(SCREEN_ASYNC_TIMEOUT_MS);
    expect(SCREEN_ASYNC_TIMEOUT_MS).toBeGreaterThan(1000);
  });
});
