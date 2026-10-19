# M3: rooms and memberships (0.4.0)

## Steps (one commit each, branch `feat/m3-rooms`)

1. **Pagination and room schemas** in `packages/types`: `pageQuerySchema` (`limit` with `z.coerce` because query strings arrive as text, default 20, max 50), a generic `pageSchema(item)`, room name (trimmed, normalized, 3–30 characters), create request, list query with `scope: 'joined' | 'open'`, `RoomDto`.
2. **Cursor pagination helpers:** opaque base64url cursors (clients never parse them; a bad one is 400), and `toPage` fetching `limit + 1` rows to know if there's a next page without a `count` query. M4's history reuses it.
3. **`memberships` module:** unique `{ userId, roomId }` index; `add` returns `false` on a duplicate instead of throwing; `remove`, `isMember`, `roomIdsFor`. Exported for M4.
4. **`rooms` module:** unique name (insert-then-catch → `NET_NAME_TAKEN`), `memberCount`, a `lastMessage` sub-document ready for M4. Join and leave only change `memberCount` when the membership really changed, so both are idempotent. Create reuses `join()`. The room is kept at 0 members.
5. **`GET /rooms` with scopes:** `joined` via `$in`, `open` via `$nin`, both sorted by name and walking the `name` index.
6. **Docs and release.**

## Decisions

1. **No MongoDB transactions** for join/leave. They need a replica set in Docker and in tests; the idempotent counter update keeps the risk small at this scale.
2. A malformed `:id` gives **404**, not 400.
3. `DELETE /rooms/:id/members/me` on an unknown room gives 404; on a room you're not in, 204.
4. **Two modules:** memberships stores and reads; rooms decides when to update the count.
5. **Socket sync waits for M4.** `join`/`leave` already return whether anything changed, so M4 can hook in without a refactor.

## Questions along the way

Between steps I asked about the backend concepts: `z.coerce`, why cursors are opaque, a join collection vs a member array on the room, soft delete, how the token becomes `@CurrentUser()`, `@Query` vs `@Param` vs `@Body`, and compound indexes and the prefix rule. The AI answered with `explain()` output from a seeded throwaway database.

## Outcome

Released as `v0.4.0` (PR #5).
