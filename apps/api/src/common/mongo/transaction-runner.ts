import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Runs database work in one MongoDB transaction: all of its writes commit, or none do. Needs a
 * replica set (docker-compose.yml and the e2e tests run a one-node one).
 *
 * Queries inside `work` join the transaction on their own: `DatabaseModule` turns on Mongoose's
 * `transactionAsyncLocalStorage`, which hands the session to every query started in `work`,
 * also in other services. So no `{ session }` options, and none can be forgotten.
 *
 * Rules for `work`:
 * - Database work only. MongoDB reruns `work` on transient errors (a write conflict with a
 *   concurrent transaction, a primary election), so a socket emit or move inside it could run
 *   twice, or for a transaction that then rolls back. Return what you need and do those after.
 * - Never catch a failed write and carry on: the server has already aborted the transaction, so
 *   nothing after it can commit. Use writes that report their outcome instead of throwing (an
 *   upsert's `upsertedCount`, a delete's `deletedCount`).
 * - Await every query, so none outlives the transaction.
 */
@Injectable()
export class TransactionRunner {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  run<T>(work: () => Promise<T>): Promise<T> {
    // `connection.transaction` (not `session.withTransaction`): it also resets document state
    // between retries, and it is what `transactionAsyncLocalStorage` hooks into.
    return this.connection.transaction(() => work());
  }
}
