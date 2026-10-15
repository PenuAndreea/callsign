# Callsign API contract

REST for auth, nets and history. Socket.IO for sending and receiving messages live.
Every shape below is a Zod schema in `packages/types`; the API validates with it and the apps parse with it.

## Conventions

- **Base path:** `/api`. JSON in and out.
- **Auth header:** `Authorization: Bearer <accessToken>` on every route except register, login, refresh and logout.
- **Client type header:** `X-Client: web | mobile`, set by the API client from the platform provider. Decides whether the refresh token travels in a cookie (web) or the body (mobile).
- **Ids:** MongoDB ObjectIds serialized as strings, field name `id` (never `_id`).
- **Dates:** ISO 8601 strings in UTC. The UI formats them as Zulu (`22:14Z`).
- **Normalization:** callsigns and net names are trimmed and lowercased by the shared schema before validation, so uniqueness is case-insensitive. Responses return them lowercase; the UI uppercases them for display.

### Pagination

Cursor-based everywhere. Query: `?cursor=<opaque>&limit=<n>` (default 20, max 50).

```ts
type Page<T> = { items: T[]; nextCursor: string | null }; // null = no more pages
```

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
  | 'RATE_LIMITED'; // 429
```

## Shared field rules

| Field             | Rule                                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| `callsign`        | trimmed, lowercased, 3 to 20 characters                                |
| `passphrase`      | 8 to 128 characters (upper bound keeps argon2 hashing cheap to reject) |
| net `name`        | trimmed, lowercased, 3 to 30 characters                                |
| message `content` | trimmed, 1 to 1000 characters                                          |

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
- **Refresh token rotation:** every `/auth/refresh` issues a new refresh token and replaces the stored hash. A reused old token fails, which limits the damage of a stolen one. The API client must run only one refresh at a time; concurrent 401s wait for it.
- **Web cookie:** `refreshToken`, `httpOnly`, `sameSite=strict`, `path=/api/auth`, `secure` from env config (on in production). Requires web and API on the same site (Vite dev proxy locally).
- **Rate limiting:** stricter on `/auth/*` (e.g. 10 requests/min per IP) than on the rest.

### Nets

| Method | Path                    | Body / query                       | Response                                                               |
| ------ | ----------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/rooms`                | `?scope=joined\|open&cursor&limit` | 200 `Page<RoomDto>`                                                    |
| POST   | `/rooms`                | `{ name }`                         | 201 `RoomDto` (creator is joined automatically) · 409 `NET_NAME_TAKEN` |
| GET    | `/rooms/:id`            |                                    | 200 `RoomDto` · 404                                                    |
| PUT    | `/rooms/:id/members/me` |                                    | 200 `RoomDto` (join; idempotent)                                       |
| DELETE | `/rooms/:id/members/me` |                                    | 204 (leave; idempotent)                                                |

- The nets screen makes two calls: `scope=joined` and `scope=open`. Both are sorted by name; the cursor is the last name of the page.
- `PUT` / `DELETE` on `members/me`: joining twice or leaving twice is not an error, which matches the unique membership index.

### Messages (history only)

| Method | Path                  | Query           | Response                                                  |
| ------ | --------------------- | --------------- | --------------------------------------------------------- |
| GET    | `/rooms/:id/messages` | `?cursor&limit` | 200 `Page<MessageDto>`, newest first · 403 `NOT_A_MEMBER` |

- Only members can read history (join first).
- There is no POST: messages are sent over the socket.
- Cursor = the `id` of the oldest message on the page; the next page is `_id < cursor`, sorted `_id: -1` (index `{ roomId: 1, _id: -1 }`).
- `sender.callsign` comes from the `senderCallsign` copy stored on the message, so no user lookup is needed.

## Socket.IO

### Connection

```ts
io(API_URL, { auth: { token: accessToken } });
```

- Middleware verifies the JWT during the handshake. Failure → `connect_error` with message `UNAUTHORIZED`; the client refreshes its token and reconnects.
- On connect the server joins the socket to:
  - `user:<userId>`, for events aimed at all of one user's devices
  - `room:<roomId>` for every net the user is a member of
- **Membership stays in sync on the server:** when the REST join or leave succeeds, the service calls `server.in('user:<userId>').socketsJoin('room:<roomId>')` (or `socketsLeave`). Clients never send join or leave events.
- The token is only checked at the handshake. An open connection survives the access token expiring; the next reconnect needs a fresh token.
- Socket.IO does not replay events missed while disconnected. On reconnect the client invalidates the open chat's messages query so the latest page is refetched.

### Events

Typed with Socket.IO's generics, `io<ClientToServerEvents, ServerToClientEvents>`, from `packages/types`.

```ts
interface ClientToServerEvents {
  'message:send': (
    payload: { roomId: string; content: string },
    ack: (res: { ok: true; message: MessageDto } | { ok: false; error: ApiError }) => void,
  ) => void;
}

interface ServerToClientEvents {
  'message:new': (message: MessageDto) => void; // to room:<roomId>, sender included
  'room:updated': (room: { id: string; memberCount: number }) => void; // to room:<roomId> on join/leave
}
```

- **`message:send` flow:** validate payload → check membership (else `NOT_A_MEMBER`) → save the message with `senderId` and `senderCallsign` from the socket's token → update `rooms.lastMessage` → ack the sender → broadcast `message:new` to `room:<roomId>`.
- The sender receives both the ack and `message:new`; the client deduplicates by message `id`.
- Rate limit `message:send` per socket (e.g. 5 messages per 5 seconds) → ack with `RATE_LIMITED`.

### Optional: typing indicator

Only if time allows. Nothing is stored.

```ts
// client → server
'typing:start': (payload: { roomId: string }) => void;
'typing:stop':  (payload: { roomId: string }) => void;
// server → client, to room:<roomId> except the sender
'typing': (payload: { roomId: string; callsign: string; isTyping: boolean }) => void;
```
