# Callsign API contract

REST for auth, nets and history. Socket.IO for sending and receiving messages live.
Every shape below is a Zod schema in `packages/types`; the API validates with it and the apps parse with it.

## Conventions

- **Base path:** `/api`. JSON in and out.
- **Auth header:** `Authorization: Bearer <accessToken>` on every route except register, login, refresh and logout.
- **Client type header:** `X-Client: web | mobile`, set by the API client from the platform provider. Decides whether the refresh token travels in a cookie (web) or the body (mobile).
- **Ids:** MongoDB ObjectIds serialized as strings, field name `id` (never `_id`).
- **Dates:** ISO 8601 strings in UTC. The UI shows them in the device's time zone (`22:14`).
- **Normalization:** callsigns and net names are trimmed and lowercased by the shared schema before validation, so uniqueness is case-insensitive. Responses return them lowercase; the UI uppercases them for display.

### Pagination

Cursor-based everywhere. Query: `?cursor=<opaque>&limit=<n>` (default 20, max 50).

```ts
type Page<T> = { items: T[]; nextCursor: string | null }; // null = no more pages
```

- `limit` must be a whole number from 1 to 50; anything else is a 400 `VALIDATION_FAILED` (not clamped).
- `cursor` is opaque (at most 200 characters): send back the previous page's `nextCursor` unchanged. A malformed cursor is a 400.
- Schemas: `pageQuerySchema` (coerces `limit` from the query string) and `pageSchema(itemSchema)`.

### Errors

Every error response has the same shape, with a stable `code` the apps map to copy:

```ts
type ApiError = { statusCode: number; code: ErrorCode; message: string };

type ErrorCode =
  | 'VALIDATION_FAILED' // 400, message lists the failing fields
  | 'INVALID_CREDENTIALS' // 401, login: same code for unknown callsign and wrong passphrase
  | 'UNAUTHORIZED' // 401, missing, expired or invalid token
  | 'NOT_A_MEMBER' // 403
  | 'NOT_FOUND' // 404
  | 'CALLSIGN_TAKEN' // 409
  | 'NET_NAME_TAKEN' // 409
  | 'RATE_LIMITED' // 429
  | 'INTERNAL_ERROR'; // 500, or any status without a code of its own (e.g. 503); details only in the server log
```

## Shared field rules

| Field             | Rule                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| `callsign`        | trimmed, lowercased, 3 to 20 characters                                |
| `passphrase`      | 8 to 128 characters (upper bound keeps argon2 hashing cheap to reject) |
| net `name`        | trimmed, lowercased, 3 to 30 characters                                |
| message `content` | trimmed, 1 to 1000 characters                                          |
| ids in payloads   | 24 hex characters (`objectIdSchema`), e.g. `roomId` in `message:send`  |

The passphrase rule applies to register. Login only checks 1 to 128 characters, so accounts created under an older, looser policy can still sign in.

"Confirm passphrase" exists only in the register form schema (`RegisterFormSchema = RegisterRequest.extend(...).refine(...)`); the API never receives it.

## DTOs

```ts
type UserDto = { id: string; callsign: string; createdAt: string };

type RoomDto = {
  id: string;
  name: string;
  memberCount: number;
  isMember: boolean; // relative to the current user
  lastMessage: { content: string; createdAt: string } | null;
  createdAt: string;
};

type MessageDto = {
  id: string;
  roomId: string;
  sender: { id: string; callsign: string };
  content: string;
  clientMessageId?: string; // echoed when the send had one
  createdAt: string;
};

type AuthResponse = {
  user: UserDto;
  accessToken: string;
  refreshToken?: string; // mobile only; web gets it as an httpOnly cookie
};
```

## REST endpoints

### Auth

| Method | Path             | Body                                                              | Response                                                            |
| ------ | ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| POST   | `/auth/register` | `{ callsign, passphrase }`                                        | 201 `AuthResponse` (registering logs you in) · 409 `CALLSIGN_TAKEN` |
| POST   | `/auth/login`    | `{ callsign, passphrase }`                                        | 200 `AuthResponse` · 401 `INVALID_CREDENTIALS`                      |
| POST   | `/auth/refresh`  | web: cookie · mobile: `{ refreshToken }`                          | 200 `AuthResponse` · 401 `UNAUTHORIZED`                             |
| POST   | `/auth/logout`   | web: cookie · mobile: `{ refreshToken }` (no access token needed) | 204, clears the stored hash and the cookie                          |
| GET    | `/auth/me`       |                                                                   | 200 `UserDto`                                                       |

- **Tokens:** the access token is a JWT (~15 min). The refresh token is an opaque random string (32 bytes), stored as a SHA-256 hash.
- **Sessions:** one per device. Login or register on one device never logs out another; logout ends only that device's session.
- **Refresh token rotation:** every `/auth/refresh` issues a new refresh token, replaces the stored hash and moves the session's expiry 30 days forward (sliding). The API client must run only one refresh at a time; concurrent 401s wait for it.
- **Grace window:** for `REFRESH_REUSE_GRACE_SECONDS` (default 10) after a rotation, the previous token still refreshes and gets a new token. That covers a client that lost the response (a reload mid-refresh) and two concurrent refreshes with the same token (two tabs). The window counts from the real rotation and retries do not extend it. The token in the lost response stops working (401, no revocation).
- **Reuse detection:** after the window, presenting a token that was already rotated away revokes that session (401, and the next refresh with the newer token is 401 too). It means someone else holds a copy, so the user logs in again.
- **Web cookie:** `refreshToken`, `httpOnly`, `sameSite=strict`, `path=/api/auth`, `secure` from env config (on in production). Requires web and API on the same site (Vite dev proxy locally).
- **Rate limiting:** 10 requests/min per IP on each `/auth/*` route, 100/min everywhere else.
- **`X-Client`:** a missing header means `web` (the token stays in the httpOnly cookie); any other value than `web` or `mobile` is a 400.

### Nets

| Method | Path                    | Body / query                       | Response                                                               |
| ------ | ----------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/rooms`                | `?scope=joined\|open&cursor&limit` | 200 `Page<RoomDto>`                                                    |
| POST   | `/rooms`                | `{ name }`                         | 201 `RoomDto` (creator is joined automatically) · 409 `NET_NAME_TAKEN` |
| GET    | `/rooms/:id`            |                                    | 200 `RoomDto` · 404 `NOT_FOUND`                                        |
| PUT    | `/rooms/:id/members/me` |                                    | 200 `RoomDto` (join; idempotent) · 404 `NOT_FOUND`                     |
| DELETE | `/rooms/:id/members/me` |                                    | 204 (leave; idempotent) · 404 `NOT_FOUND`                              |

- The nets screen makes two calls: `scope=joined` and `scope=open`. Both are sorted by name; the cursor is the last name of the page.
- `PUT` / `DELETE` on `members/me`: joining twice or leaving twice is not an error, which matches the unique membership index. Leaving a net you never joined is a 204 too.
- `404 NOT_FOUND` means the net does not exist; a malformed `:id` is a 404 as well (not a 400).
- When the last member leaves, the net is kept with `memberCount: 0` and shows under `scope=open`.

### Messages (history only)

| Method | Path                  | Query           | Response                                                                    |
| ------ | --------------------- | --------------- | --------------------------------------------------------------------------- |
| GET    | `/rooms/:id/messages` | `?cursor&limit` | 200 `Page<MessageDto>`, newest first · 403 `NOT_A_MEMBER` · 404 `NOT_FOUND` |

- Only members can read history (join first). History includes messages sent before you joined.
- One membership lookup answers access: a well-formed id of a net that does not exist is a 403 `NOT_A_MEMBER` too (there is no membership without a net). A malformed `:id` is a 404, as on the other net routes.
- There is no POST: messages are sent over the socket.
- Cursor = the `id` of the oldest message on the page; the next page is `_id < cursor`, sorted `_id: -1` (index `{ roomId: 1, _id: -1 }`).
- `sender.callsign` comes from the `senderCallsign` copy stored on the message, so no user lookup is needed.

## Socket.IO

### Connection

```ts
io(API_URL, { auth: { token: accessToken } });
```

- Same port as the API, default path `/socket.io` (the `/api` prefix does not apply to sockets). Same CORS rule as REST: only `WEB_ORIGIN`, with credentials. Payloads above 16 KB are refused.
- Middleware verifies the JWT during the handshake. Failure → `connect_error` with `message` = the error code (`UNAUTHORIZED`) and `data` = the full `ApiError`; the client refreshes its token and reconnects. If the server cannot load the user's nets, the handshake fails the same way with `INTERNAL_ERROR`.
- During the handshake (so before the client sees `connect`), the server joins the socket to:
  - `user:<userId>` first, for events aimed at all of one user's devices
  - `room:<roomId>` for every net the user is a member of
- **Membership stays in sync on the server:** every REST join or leave (creating a net too) calls `server.in('user:<userId>').socketsJoin('room:<roomId>')` (or `socketsLeave`), so all of that user's open sockets start or stop receiving the net, without reconnecting. Clients never send join or leave events. This also runs on a repeated join or leave, which repairs a socket that missed an earlier sync.
- **`room:updated`** goes out only when the member count really changed: after a join to the whole net, the joiner's sockets included (they are moved in first); after a leave to the remaining members only (the leaver's sockets are moved out first). The leaver's other devices learn about it when they refetch the nets list.
- The token is only checked at the handshake. An open connection survives the access token expiring; the next reconnect needs a fresh token.
- **Known gap (accepted for v1):** if a leave over REST lands in the moment between a connecting socket reading its nets and joining their rooms, that socket still joins the net it just left (`socketsLeave` ran before it was in the room). Until it reconnects it keeps **receiving** that net's `message:new`; sending and history are still refused, because both check `memberships`. Nets are public, so nothing private leaks. If private nets ever exist, re-read the memberships after the joins and leave any room no longer listed.
- Socket.IO does not replay events missed while disconnected. On reconnect the client invalidates the open chat's messages query so the latest page is refetched.

### Events

Typed with Socket.IO's generics from `packages/types`: both sides take `<ListenEvents, EmitEvents>` from their own point of view, so the apps type the socket as `Socket<ServerToClientEvents, ClientToServerEvents>` (`io()` itself is not generic) and the API uses `Server<ClientToServerEvents, ServerToClientEvents>`. Schemas: `sendMessageRequestSchema`, `sendMessageAckSchema` (`SendMessageAck`), `roomUpdatedEventSchema`, `messageDtoSchema`.

```ts
interface ClientToServerEvents {
  'message:send': (
    payload: { roomId: string; content: string; clientMessageId?: string }, // UUID
    ack: (res: { ok: true; message: MessageDto } | { ok: false; error: ApiError }) => void,
  ) => void;
}

interface ServerToClientEvents {
  'message:new': (message: MessageDto) => void; // to room:<roomId>, sender included
  'room:updated': (room: { id: string; memberCount: number }) => void; // to room:<roomId> when a join/leave changes the count
}
```

- **`message:send` flow:** rate limit (5 messages in any 5 seconds per socket, else `RATE_LIMITED`) → validate the payload with `sendMessageRequestSchema` (else `VALIDATION_FAILED`) → check membership in the database (else `NOT_A_MEMBER`, also for a net that does not exist) → save the message with `senderId` and `senderCallsign` from the socket's token (any sender in the payload is ignored) → update `rooms.lastMessage` → ack the sender → broadcast `message:new` to `room:<roomId>`.
- **The preview update** sets `lastMessage` only if the room has none or holds an older message (compared by message id, in one atomic update), so sends that finish out of order keep the newest preview. It is best effort: once the message is saved the send has succeeded, so a failed preview write is logged and the ack is still `ok`. The preview is cut to 80 characters (code points), ending in `…`.
- The sender receives the ack first, then `message:new` like every other member's socket; the client deduplicates by message `id`. A client may emit without an ack callback; the message is still saved and broadcast.
- **Idempotent sends (`clientMessageId`):** optional, a UUID (lowercased) the client creates once per message and reuses on every retry. If this sender already saved a message with that key in that net, the ack is `{ ok: true, message }` with the **saved** message (its content wins if the retry's differs), nothing is saved, the preview is not touched and `message:new` is **not** sent again. A unique partial index `{ senderId, roomId, clientMessageId }` decides, so racing retries also produce one message. The same key from another station or in another net is a new message. Without a key every send is saved. The saved message carries the key in `MessageDto.clientMessageId` (ack and `message:new`), so every device of the sender can match its pending bubble. Retries still count against the rate limit.
- **Client retry rule:** an ack timeout does not prove the message was not saved. With a key the client may resend safely; without one it must not resend automatically.
- Errors in the ack use the same `ApiError` shape and codes as REST; unexpected failures are `INTERNAL_ERROR` with details only in the server log.

### Optional: typing indicator

Only if time allows. Nothing is stored.

```ts
// client → server
'typing:start': (payload: { roomId: string }) => void;
'typing:stop':  (payload: { roomId: string }) => void;
// server → client, to room:<roomId> except the sender
'typing': (payload: { roomId: string; callsign: string; isTyping: boolean }) => void;
```
