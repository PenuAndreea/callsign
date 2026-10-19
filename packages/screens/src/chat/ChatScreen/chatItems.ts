import type { ChatEntry } from '@callsign/hooks';

import { dayKey, dayLabel } from '../../format/day';

/** A row of the chat list: a message (saved or pending), or the day the messages above it start. */
export type ChatItem = ChatEntry | { type: 'day'; key: string; label: string };

const sentAt = (entry: ChatEntry) =>
  entry.type === 'message' ? entry.message.createdAt : entry.pending.createdAt;

/**
 * The entries (newest first, for an inverted list) with a day separator after each day's
 * oldest entry, so it shows above that day. The oldest loaded day gets one too; it moves up
 * when older pages load (same key, so the row is kept).
 */
export function withDaySeparators(entries: ChatEntry[], now: Date): ChatItem[] {
  const items: ChatItem[] = [];
  entries.forEach((entry, index) => {
    items.push(entry);
    const day = dayKey(sentAt(entry));
    const older = entries[index + 1];
    if (older === undefined || dayKey(sentAt(older)) !== day) {
      items.push({ type: 'day', key: `day-${day}`, label: dayLabel(sentAt(entry), now) });
    }
  });
  return items;
}
