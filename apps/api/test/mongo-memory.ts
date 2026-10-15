import type { MongoMemoryServer } from 'mongodb-memory-server';

/** Env var that carries the memory server's URI from `globalSetup` to each test file. */
export const MONGO_MEMORY_URI = 'MONGO_MEMORY_URI';

// globalSetup and globalTeardown run in the same process, so the instance can live on globalThis.
const holder = globalThis as { mongoMemoryServer?: MongoMemoryServer };

export function keepServer(server: MongoMemoryServer): void {
  holder.mongoMemoryServer = server;
}

export function takeServer(): MongoMemoryServer | undefined {
  const server = holder.mongoMemoryServer;
  delete holder.mongoMemoryServer;
  return server;
}
