import type { ChatEntry } from '@callsign/hooks';
import { describe, expect, it } from 'vitest';

import { withDaySeparators } from './chatItems';

const now = new Date('2026-10-19T14:00:00.000Z');

const saved = (id: string, createdAt: string): ChatEntry => ({
  type: 'message',
  key: id,
  message: {
    id,
    roomId: 'net',
    sender: { id: 'wolf', callsign: 'wolf-2' },
    content: id,
    createdAt,
  },
});

const pending = (id: string, createdAt: string): ChatEntry => ({
  type: 'pending',
  key: id,
  pending: {
    clientMessageId: id,
    roomId: 'net',
    content: id,
    createdAt,
    status: 'sending',
    error: null,
  },
});

const keys = (entries: ChatEntry[]) => withDaySeparators(entries, now).map((item) => item.key);

describe('withDaySeparators', () => {
  it('puts each day after its oldest entry, so it shows above that day in an inverted list', () => {
    const entries = [
      pending('p', '2026-10-19T13:59:00.000Z'),
      saved('c', '2026-10-18T22:01:00.000Z'), // 00:01 on 19 Oct in Brussels
      saved('b', '2026-10-18T21:59:00.000Z'), // 23:59 on 18 Oct
      saved('a', '2026-10-17T10:00:00.000Z'),
    ];
    expect(keys(entries)).toEqual([
      'p',
      'c',
      'day-2026-10-19',
      'b',
      'day-2026-10-18',
      'a',
      'day-2026-10-17',
    ]);
  });

  it('labels the separators', () => {
    const items = withDaySeparators(
      [saved('b', '2026-10-19T09:00:00.000Z'), saved('a', '2026-10-18T09:00:00.000Z')],
      now,
    );
    expect(items.flatMap((item) => (item.type === 'day' ? [item.label] : []))).toEqual([
      'Today',
      'Yesterday',
    ]);
  });

  it('adds nothing to an empty chat', () => {
    expect(withDaySeparators([], now)).toEqual([]);
  });
});
