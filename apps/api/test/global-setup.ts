import { MongoMemoryServer } from 'mongodb-memory-server';

import { keepServer, MONGO_MEMORY_URI } from './mongo-memory';

/**
 * Starts one in-memory MongoDB for the whole e2e run. Workers are spawned after this,
 * so they inherit the URI; `setup-env.ts` gives each test file its own database on it.
 */
export default async function globalSetup(): Promise<void> {
  const server = await MongoMemoryServer.create();
  keepServer(server);
  process.env[MONGO_MEMORY_URI] = server.getUri();
}
