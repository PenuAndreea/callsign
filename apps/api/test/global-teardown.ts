import { takeServer } from './mongo-memory';

export default async function globalTeardown(): Promise<void> {
  await takeServer()?.stop();
}
