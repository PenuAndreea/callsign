# M5: frontend integration (0.6.0)

## Decisions

1. **Idempotency key on `message:send`:** an optional `clientMessageId` with a unique partial index, so a retry acks the saved message instead of duplicating it. Without it, a failed send could only be "copy and send again".
2. **Shared screens:** a new `packages/screens` with screen bodies that take navigation as callbacks (`onSignedIn`, `onOpenNet(id)`); the apps only handle routing. The alternative duplicated every form and list per app.
3. **Forms:** `react-hook-form` with the Zod resolver and `Controller` around our `Input`, reusing the shared schemas.
4. **API client:** a thin `fetch` wrapper that sets `X-Client`, parses every response with the shared schema, turns error bodies into `ApiClientError`, and runs a single-flight refresh with one retry. `ky`/`axios` add little here.
5. **Auth state:** a small session store read with `useSyncExternalStore` (`restoring | signedOut | signedIn`), the access token in a module variable and never in React state. Not a TanStack `['session']` query, which would mix the token lifecycle into cache semantics.
6. **Chat list:** `FlatList inverted` on both platforms, with `onEndReached` for older pages.
7. **Mobile routing:** Expo Router `Stack.Protected` groups; web uses React Router with a `RequireAuth` layout route.

## Steps

0. **API:** `clientMessageId`, plus a refresh reuse grace window found while wiring the client (the previous token still refreshes for a few seconds after a rotation, instead of revoking the session).
1. **`packages/hooks` scaffold:** provider with the injected platform (base URL, client type, refresh-token store, socket factory), the API client, query defaults; MSW tests.
2. **Auth hooks:** `useSession`, `useLogin`, `useRegister`, `useLogout`, restore on start, an "unreachable" state.
3. **Web auth screens and routing.**
4. **Nets:** `useNets(scope)` (infinite), `useNet`, create/join/leave updating both lists; Nets and New net screens.
5. **Realtime:** one socket per signed-in session, the token read on every handshake, refresh on a refused handshake, catch-up after a reconnect, live previews and member counts written into the cache.
6. **Chat:** `useNetMessages` (history + live, deduped) and `useSendMessage` (pending → sent or failed with Retry); the chat screen and the web split layout.
7. **Mobile:** SecureStore refresh token, per-emulator API URLs, Expo Router groups, safe areas, keyboard avoidance, the same screens.
8. **Wrap-up:** docs, and every screen checked on web at 375 px, iOS and Android, light and dark.

## What changed during the milestone

- **The PR was too big.** All steps landed on one branch (~25 commits). Before review it was split into **five stacked PRs** (#8 API → #9 auth → #10 nets → #11 chat → #12 mobile), merged in order. Since then, each plan proposes the PR split up front.
- **Native-only bugs** turned up in the device checks, not the tests: Android keyboards capitalized passphrases, and the next key didn't move focus.
- **A CI-only failure:** the first App render took 2.3 s on CI against 70 ms locally. Screen tests now wait up to 5 s.
- Rename: `CallsignProvider` / `CallsignPlatform` became `ApiProvider` / `ApiPlatform` (no project name in identifiers).

## Outcome

Released as `v0.6.0`.
