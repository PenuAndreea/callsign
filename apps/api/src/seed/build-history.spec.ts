import { Types } from 'mongoose';

import { buildHistory, LINE_SPACING_SECONDS, objectIdAt, scheduleScript } from './build-history';
import type { Exchange, NetScript } from './seed.types';

const now = new Date('2026-10-19T12:00:00.000Z');

const takeoff: Exchange = [
  { from: 'tower', text: 'Wolf Two, cleared for takeoff.' },
  { from: 'wolf-2', text: 'Cleared for takeoff, Wolf Two.' },
];
const handoff: Exchange = [{ from: 'tower', text: 'Wolf Two, contact Approach.' }];

const script: NetScript = { fromMinutesAgo: 60, toMinutesAgo: 10, exchanges: [takeoff, handoff] };

describe('scheduleScript', () => {
  it('spreads exchanges between the bounds and spaces their calls', () => {
    const times = scheduleScript(script, now).map(({ at }) => at.toISOString());
    expect(times).toEqual([
      '2026-10-19T11:00:00.000Z',
      new Date(Date.parse('2026-10-19T11:00:00.000Z') + LINE_SPACING_SECONDS * 1000).toISOString(),
      '2026-10-19T11:50:00.000Z',
    ]);
  });

  it('starts a single exchange at fromMinutesAgo', () => {
    const [first] = scheduleScript({ ...script, exchanges: [handoff] }, now);
    expect(first?.at.toISOString()).toBe('2026-10-19T11:00:00.000Z');
  });

  it('throws when an exchange runs into the next one', () => {
    const tight: NetScript = { ...script, fromMinutesAgo: 11, toMinutesAgo: 10 };
    const long = Array.from({ length: 3 }, () => ({ from: 'tower', text: 'Over.' }));
    expect(() => scheduleScript({ ...tight, exchanges: [long, long] }, now)).toThrow(/overlaps/);
  });

  it('throws when the last exchange runs past now', () => {
    const late: NetScript = {
      fromMinutesAgo: 0,
      toMinutesAgo: 0,
      exchanges: [takeoff],
    };
    expect(() => scheduleScript(late, now)).toThrow(/overlaps/);
  });
});

describe('objectIdAt', () => {
  it('carries the second of the date and stays unique within it', () => {
    const at = new Date('2026-10-19T11:00:00.700Z');
    const [a, b] = [objectIdAt(at), objectIdAt(at)];
    expect(a.getTimestamp().toISOString()).toBe('2026-10-19T11:00:00.000Z');
    expect(a.equals(b)).toBe(false);
  });
});

describe('buildHistory', () => {
  const roomId = new Types.ObjectId();
  const senders = new Map([
    ['tower', new Types.ObjectId()],
    ['wolf-2', new Types.ObjectId()],
  ]);

  it('builds messages oldest first, with ids in the same order as the times', () => {
    const messages = buildHistory({ roomId, script, senders, now });
    expect(messages.map((m) => m.senderCallsign)).toEqual(['tower', 'wolf-2', 'tower']);
    expect(messages.every((m) => m.roomId.equals(roomId))).toBe(true);
    expect(messages[1]?.senderId).toBe(senders.get('wolf-2'));
    const ids = messages.map((m) => m._id.toHexString());
    expect(ids).toEqual([...ids].sort());
    for (const message of messages) {
      expect(message._id.getTimestamp()).toEqual(message.createdAt);
    }
  });

  it('rejects a sender that is not a member', () => {
    const stranger: NetScript = { ...script, exchanges: [[{ from: 'eagle-1', text: 'Hello.' }]] };
    expect(() => buildHistory({ roomId, script: stranger, senders, now })).toThrow(/eagle-1/);
  });

  it('validates content like a real send', () => {
    const blank: NetScript = { ...script, exchanges: [[{ from: 'tower', text: '   ' }]] };
    expect(() => buildHistory({ roomId, script: blank, senders, now })).toThrow();
  });
});
