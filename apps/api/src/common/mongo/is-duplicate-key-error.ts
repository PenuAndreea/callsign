import { mongo } from 'mongoose';

const DUPLICATE_KEY = 11000;

/**
 * True when a write broke a unique index. Insert and catch this instead of "check, then insert":
 * two concurrent requests can both pass the check, but only one can pass the index.
 * Pass `key` to tell which unique index failed when a collection has several.
 */
export function isDuplicateKeyError(error: unknown, key?: string): boolean {
  if (!(error instanceof mongo.MongoServerError) || error.code !== DUPLICATE_KEY) return false;
  if (key === undefined) return true;
  const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern;
  return keyPattern !== undefined && key in keyPattern;
}
