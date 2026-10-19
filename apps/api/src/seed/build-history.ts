import { messageContentSchema } from '@callsign/types';
import { Types } from 'mongoose';

import type { NetScript, ScriptLine } from './seed.types';

/** Time between the calls of one exchange. Whole seconds, so every call gets its own `_id` second. */
export const LINE_SPACING_SECONDS = 45;

const MINUTE_MS = 60_000;

export interface ScheduledLine extends ScriptLine {
  at: Date;
}

/**
 * Gives every call of the script its time: exchanges spread evenly between the script's two
 * bounds, calls within an exchange `LINE_SPACING_SECONDS` apart. Times are whole seconds.
 * Pure and deterministic for a given `now`.
 * @throws Error when an exchange runs into the next one or past `now`.
 */
export function scheduleScript(script: NetScript, now: Date): ScheduledLine[] {
  const { fromMinutesAgo, toMinutesAgo, exchanges } = script;
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const step = exchanges.length > 1 ? (fromMinutesAgo - toMinutesAgo) / (exchanges.length - 1) : 0;
  const startSeconds = exchanges.map(
    (_, index) => nowSeconds - Math.round(((fromMinutesAgo - step * index) * MINUTE_MS) / 1000),
  );

  return exchanges.flatMap((exchange, index) => {
    const start = startSeconds[index] ?? nowSeconds;
    const limit = startSeconds[index + 1] ?? nowSeconds + 1;
    return exchange.map((line, position) => {
      const seconds = start + position * LINE_SPACING_SECONDS;
      if (seconds >= limit) {
        throw new Error(`Seed exchange ${index} overlaps the next one: spread the script wider`);
      }
      return { ...line, at: new Date(seconds * 1000) };
    });
  });
}

/** A message ready for `insertMany`: the `_id` carries the same second as `createdAt`. */
export interface HistoryMessage {
  _id: Types.ObjectId;
  roomId: Types.ObjectId;
  senderId: Types.ObjectId;
  senderCallsign: string;
  content: string;
  createdAt: Date;
}

/**
 * An ObjectId for a past moment. History pages walk `_id`, so a backdated message needs a
 * backdated id. The other 8 bytes come from a fresh id, so ids made in one second never collide.
 */
export function objectIdAt(date: Date): Types.ObjectId {
  const seconds = Math.floor(date.getTime() / 1000)
    .toString(16)
    .padStart(8, '0');
  return new Types.ObjectId(seconds + new Types.ObjectId().toHexString().slice(8));
}

/**
 * The messages of one net, oldest first. Content goes through the shared schema, like a real send.
 * @throws Error for a sender that is not in `senders` (not a member of the net).
 */
export function buildHistory(input: {
  roomId: Types.ObjectId;
  script: NetScript;
  senders: ReadonlyMap<string, Types.ObjectId>;
  now: Date;
}): HistoryMessage[] {
  const { roomId, script, senders, now } = input;
  return scheduleScript(script, now).map(({ from, text, at }) => {
    const senderId = senders.get(from);
    if (!senderId) throw new Error(`Seed sender "${from}" is not a member of the net`);
    return {
      _id: objectIdAt(at),
      roomId,
      senderId,
      senderCallsign: from,
      content: messageContentSchema.parse(text),
      createdAt: at,
    };
  });
}
