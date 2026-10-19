# M4: messages and realtime (0.5.0)

## Steps (one commit each)

1. **Messages and socket contract** in `packages/types`: message content (trimmed, 1–1000 characters), send request, `MessageDto`, message page, an ack union on `ok` (so `if (ack.ok)` narrows to the message, otherwise an `ApiError`), and the typed `ClientToServerEvents` / `ServerToClientEvents`.
2. **Messages module and history:** `{ roomId: 1, _id: -1 }` index, mapper, `GET /rooms/:id/messages` reusing the M3 cursor helpers with `_id` as the cursor.
3. **Socket.IO gateway:** a custom `IoAdapter` in `configureApp` for CORS (so e2e tests get it too); **handshake middleware** verifies the JWT and joins `user:<id>` and every `room:<id>` the user belongs to.
4. **`message:send`:** validate → check membership → save → update the `lastMessage` preview → ack → broadcast `message:new`. A per-socket limit of 5 messages per 5 s acks `RATE_LIMITED`.
5. **Membership sync:** REST join/leave moves the user's open sockets and emits `room:updated` with the new member count.
6. **(Optional) typing indicator.**
7. **Docs, release,** and a smoke test of the built API with a small socket client.

## Design facts (no choice needed)

- **The global guards break on sockets:** `APP_GUARD`s also run on `@SubscribeMessage` handlers and call `switchToHttp()`. They skip non-HTTP contexts.
- **Middleware, not a guard, for socket auth:** guards run per event after the connection exists; middleware runs at the handshake, so a bad token never connects.
- **Acks come free:** what a handler returns is the ack. Handlers catch and return `{ ok: false, error }`, reusing the HTTP error mapping.

## Decisions

| #   | Question                                                               | Options                                                                                                              | Chosen                                                                                  |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | How `RoomsService` reaches the socket server without a circular import | **A** `RealtimeModule` with a `RealtimeService` holding the server · B domain events through `@nestjs/event-emitter` | **A**                                                                                   |
| 2   | History for a valid id with no net behind it                           | **A** membership check only → 403 · B look up the room first → 404 (an extra query per page)                         | **A**, after I asked when it can happen                                                 |
| 3   | Out-of-order `lastMessage` writes                                      | **A** conditional update, compare ObjectIds · B accept it                                                            | **A**                                                                                   |
| 4   | Membership check on send                                               | **A** `isMember` in the DB every time · B `socket.rooms` in memory (breaks with several instances)                   | **A**, after the AI explained it's one indexed lookup and the DB is the source of truth |

I also asked about the Redis adapter (needed once there is more than one API instance; out of scope) and about deleting rooms. My call: never auto-delete an empty room; deletion by the creator can come later.

## Along the way

- I asked "why are the Socket.IO generics in a different order on server and client?" The answer: each side lists the events it _listens to_ first.
- I asked the AI to re-check all changes against the real library types. That caught `io()` not being generic and an uppercase-id bug.
- The **typing indicator** (step 6) was built but parked in a `git stash` to keep the milestone focused; it comes back in M6.
- A known accepted gap: a leave that lands during a socket's handshake leaves that socket in the room until it reconnects.

## Outcome

Released as `v0.5.0` (PR #6).
