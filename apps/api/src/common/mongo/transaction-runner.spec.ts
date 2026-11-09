import type { Connection } from 'mongoose';

import { TransactionRunner } from './transaction-runner';

// Commit and rollback against a real replica set: test/transactions.e2e-spec.ts.
describe('TransactionRunner', () => {
  const transaction = jest.fn((fn: () => Promise<unknown>) => fn());
  const runner = new TransactionRunner({ transaction } as unknown as Connection);

  beforeEach(() => {
    transaction.mockClear();
  });

  it('runs the work in a transaction on the connection and returns its result', async () => {
    await expect(runner.run(() => Promise.resolve('done'))).resolves.toBe('done');
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('passes on what the work throws', async () => {
    const failure = new Error('write failed');
    await expect(runner.run(() => Promise.reject(failure))).rejects.toBe(failure);
  });
});
