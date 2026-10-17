import type { MessageDto, Page } from '@callsign/types';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import { netKeys } from '../nets/netKeys';

export type MessagePages = InfiniteData<Page<MessageDto>, string | undefined>;

/** Newest first, like the API. Ids are ObjectIds: same length hex, so they sort as strings. */
const newestFirst = (a: MessageDto, b: MessageDto) => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);

/**
 * Adds a saved message to its net's loaded history (the ack, then `message:new` with the same
 * id: kept once). Nothing happens when that history is not loaded; it is fetched when opened.
 * A message older than the whole first page while older pages exist is left to those pages.
 */
export function insertMessage(queryClient: QueryClient, message: MessageDto): void {
  queryClient.setQueryData<MessagePages>(netKeys.messages(message.roomId), (data) => {
    const first = data?.pages[0];
    if (!data || !first) return data;
    if (data.pages.some((page) => page.items.some((item) => item.id === message.id))) return data;
    const oldest = first.items.at(-1);
    if (first.nextCursor !== null && oldest && message.id < oldest.id) return data;
    const items = [...first.items, message].sort(newestFirst);
    return { ...data, pages: [{ ...first, items }, ...data.pages.slice(1)] };
  });
}
