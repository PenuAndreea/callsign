import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { keepServer, MONGO_MEMORY_URI } from './mongo-memory';

/**
 * Starts one in-memory MongoDB for the whole e2e run: a one-node replica set (on wiredTiger), as
 * transactions need, like docker-compose.yml. Workers are spawned after this,
 * so they inherit the URI; `setup-env.ts` gives each test file its own database on it.
 */
export default async function globalSetup(): Promise<void> {
  const server = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger' } });
  keepServer(server);
  process.env[MONGO_MEMORY_URI] = server.getUri();
}
