import { ApiClientError } from '@callsign/hooks';
import { describe, expect, it } from 'vitest';

import { formErrorExcept } from './formErrorExcept';

describe('formErrorExcept', () => {
  it('leaves the field code to its field', () => {
    const taken = new ApiClientError(409, 'NET_NAME_TAKEN', 'x');
    expect(formErrorExcept(taken, 'NET_NAME_TAKEN')).toBeUndefined();
  });

  it('returns the copy of every other error', () => {
    const offline = new ApiClientError(0, 'NETWORK_ERROR', 'x');
    expect(formErrorExcept(offline, 'NET_NAME_TAKEN')).toMatch(/No contact/);
  });

  it('returns nothing without an error', () => {
    expect(formErrorExcept(null, 'NET_NAME_TAKEN')).toBeUndefined();
  });
});
