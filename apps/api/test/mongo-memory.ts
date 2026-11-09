import type { MongoMemoryReplSet } from 'mongodb-memory-server';

/** Env var that carries the memory replica set's URI from `globalSetup` to each test file. */
export const MONGO_MEMORY_URI = 'MONGO_MEMORY_URI';

// globalSetup and globalTeardown run in the same process, so the instance can live on globalThis.
const holder = globalThis as { mongoMemoryReplSet?: MongoMemoryReplSet };

export function keepServer(server: MongoMemoryReplSet): void {
  holder.mongoMemoryReplSet = server;
}

export function takeServer(): MongoMemoryReplSet | undefined {
  const server = holder.mongoMemoryReplSet;
  delete holder.mongoMemoryReplSet;
  return server;
}
