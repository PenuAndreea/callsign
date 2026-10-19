import { NestFactory } from '@nestjs/core';

import { SEED_PASSPHRASE } from './seed-data';
import { SeedModule } from './seed.module';
import { Seeder } from './seeder.service';

/**
 * `pnpm db:seed`: wipes the development database and fills it with the seed data.
 * A command-line script, so it prints its summary with `console` (Nest's own logs: errors only).
 */
async function seed(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['error', 'warn'] });
  try {
    const summary = await app.get(Seeder).run();
    console.log(`Seeded ${summary.stations} stations (passphrase "${SEED_PASSPHRASE}"):`);
    for (const net of summary.nets) {
      console.log(
        `  ${net.name}: ${count(net.members, 'member')}, ${count(net.messages, 'message')}`,
      );
    }
  } finally {
    await app.close();
  }
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

seed().catch((error: unknown) => {
  console.error('Seed failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
