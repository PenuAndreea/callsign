import type { RoomScope } from '@callsign/types';

/**
 * Query keys of everything about nets, from broad to narrow, so one prefix invalidates a group:
 * `netKeys.lists()` refetches both sections after a join, leave or create.
 */
export const netKeys = {
  all: ['nets'] as const,
  lists: () => [...netKeys.all, 'list'] as const,
  list: (scope: RoomScope) => [...netKeys.lists(), scope] as const,
  detail: (id: string) => [...netKeys.all, 'detail', id] as const,
  /** A net's history. Under `all`, so the reconnect catch-up refetches it with the lists. */
  messages: (id: string) => [...netKeys.all, 'messages', id] as const,
};
