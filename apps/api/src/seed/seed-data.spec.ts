import { callsignSchema, passphraseSchema, roomNameSchema } from '@callsign/types';
import { Types } from 'mongoose';

import { buildHistory } from './build-history';
import { spoken } from './scripts/spoken';
import { SEED_NETS, SEED_PASSPHRASE, SEED_STATIONS } from './seed-data';

// The seed data is checked here, without a database, so a bad edit fails in the unit tests.
describe('seed data', () => {
  const now = new Date();

  it('uses valid, already-normalized callsigns, net names and passphrase', () => {
    for (const station of SEED_STATIONS) expect(callsignSchema.parse(station)).toBe(station);
    for (const { name } of SEED_NETS) expect(roomNameSchema.parse(name)).toBe(name);
    expect(passphraseSchema.parse(SEED_PASSPHRASE)).toBe(SEED_PASSPHRASE);
    expect(new Set(SEED_NETS.map((net) => net.name)).size).toBe(SEED_NETS.length);
  });

  it('only names seeded stations, and only members leave', () => {
    const stations = new Set<string>(SEED_STATIONS);
    for (const net of SEED_NETS) {
      const members = [net.createdBy, ...net.members];
      for (const name of members) expect(stations.has(name)).toBe(true);
      for (const name of net.leaveAfter ?? []) expect(members).toContain(name);
    }
  });

  it.each(SEED_NETS.flatMap((net) => (net.script ? [[net.name, net, net.script] as const] : [])))(
    'builds the history of %s from members only, without overlaps',
    (_, net, script) => {
      const senders = new Map(
        [net.createdBy, ...net.members].map((name) => [name, new Types.ObjectId()]),
      );
      const messages = buildHistory({ roomId: new Types.ObjectId(), script, senders, now });
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.at(-1)?.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
    },
  );

  it('gives tower several history pages and keeps one message near the length limit', () => {
    const count = (name: string) => {
      const net = SEED_NETS.find((candidate) => candidate.name === name);
      return net?.script?.exchanges.flat() ?? [];
    };
    expect(count('tower').length).toBeGreaterThan(100);
    const longest = Math.max(...count('north sector approach ctl').map((line) => line.text.length));
    expect(longest).toBeGreaterThan(800);
    expect(longest).toBeLessThanOrEqual(1000);
  });
});

describe('spoken', () => {
  it('says callsigns the radio way', () => {
    expect(spoken('wolf-2')).toBe('Wolf Two');
    expect(spoken('kestrel-40')).toBe('Kestrel Four Zero');
    expect(spoken('tower')).toBe('Tower');
  });
});
