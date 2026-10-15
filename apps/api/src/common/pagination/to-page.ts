import type { Page } from '@callsign/types';

import { encodeCursor } from './cursor';

/**
 * The `limit` to give the database query: one row more than the page size.
 * If that extra row comes back, there is a next page, so no separate `count` query is needed.
 */
export function pageFetchLimit(limit: number): number {
  return limit + 1;
}

type ToPageOptions<TDoc, TItem> = {
  /** The page size the client asked for (not the fetch limit). */
  limit: number;
  /** The sort key of a row (e.g. its name), wrapped into `nextCursor`. */
  cursorOf: (doc: TDoc) => string;
  toItem: (doc: TDoc) => TItem;
};

/** Turns `limit + 1` sorted rows (see `pageFetchLimit`) into a `Page`. */
export function toPage<TDoc, TItem>(
  docs: readonly TDoc[],
  { limit, cursorOf, toItem }: ToPageOptions<TDoc, TItem>,
): Page<TItem> {
  const pageDocs = docs.slice(0, limit);
  const last = pageDocs.at(-1);
  const hasMore = docs.length > limit;
  return {
    items: pageDocs.map(toItem),
    nextCursor: hasMore && last !== undefined ? encodeCursor(cursorOf(last)) : null,
  };
}
