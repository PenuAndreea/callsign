import { mongo } from 'mongoose';

import { isDuplicateKeyError } from './is-duplicate-key-error';

function serverError(code: number, keyPattern?: Record<string, number>): mongo.MongoServerError {
  return new mongo.MongoServerError({ message: 'E11000 duplicate key error', code, keyPattern });
}

describe('isDuplicateKeyError', () => {
  it('detects a duplicate key error', () => {
    expect(isDuplicateKeyError(serverError(11000, { callsign: 1 }))).toBe(true);
  });

  it('matches the failing index key when one is given', () => {
    const error = serverError(11000, { callsign: 1 });
    expect(isDuplicateKeyError(error, 'callsign')).toBe(true);
    expect(isDuplicateKeyError(error, 'name')).toBe(false);
  });

  it('ignores other server errors and non-Mongo errors', () => {
    expect(isDuplicateKeyError(serverError(121))).toBe(false);
    expect(isDuplicateKeyError(new Error('E11000'))).toBe(false);
    expect(isDuplicateKeyError({ code: 11000 })).toBe(false);
  });
});
