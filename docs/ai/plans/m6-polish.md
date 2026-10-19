# M6: polish and extras (0.7.0)

M6 was planned differently from M0–M5: QA first, then one small PR per concern instead of one milestone plan.

## 1. QA pass

I asked the AI to act as a QA engineer and test everything before adding more. It ran the full check suite and about 115 black-box checks against the built API (validation, rate limits, refresh rotation and reuse detection, forged and `alg:none` tokens, CORS, cursors, parallel joins). It also tested web, iOS and Android by hand: session restore, live chat, paging, failed sends with Retry, keyboard, light and dark.

**Four bugs found:**

1. A link to a net that doesn't exist dead-ended on "Join the net", and Join then failed silently.
2. Join and Leave errors inside the chat were never shown.
3. After an outage the chat stayed on "Something went wrong" with a blank header: the reconnect refetch skipped queries that never got data.
4. The composer could drop the end of a message: Return sent the `value` from the last render ("…check. Over." was saved as "…check." on iOS).

It also produced a polish list (dates and day separators, rate-limit copy, a white overscroll flash in dark mode, and more), most of it kept for later.

## 2. Error-handling plan

There was no error boundary anywhere. The AI also flagged that boundaries catch only render-time throws, so they would not have caught any of the four bugs. The plan used layers instead:

| Layer              | What it does                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Crash boundaries   | Shared `CrashScreen`; one boundary at the root and one per route, so on web a crashed chat panel leaves the nets list working |
| Error routing rule | `ApiClientError` is expected and shown inline; anything else is a bug thrown to the nearest boundary                          |
| Classification     | A 502/503/504 without an `ApiError` body counts as `NETWORK_ERROR` ("No contact"); socket rate-limit copy                     |
| Screen states      | The chat checks the net's 404 before the history's 403                                                                        |
| Recovery           | Reconnect also refetches queries that failed; `useNet` keeps the list copy as `initialData`                                   |
| Reporting          | `ApiPlatform.reportError`, console for now, the one place to plug in Sentry later                                             |

**My choices:** `react-error-boundary`; `throwOnError` only for non-`ApiClientError`; the `reportError` seam. A global notice for failed mutations was planned and then **dropped**: inline errors where the action happens were enough.

## 3. PRs, one concern each

| PR                | Scope                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Error handling    | Boundaries on web and mobile, `CrashScreen`, the throw rule, `reportError`, error classification                                         |
| Chat error states | Reconnect refetches failed queries, `useNet` `initialData`, "off the air" for a missing net (new `ChatNotice`), inline join/leave errors |
| Chat polish       | Leave error copy, local message times and day separators, composer sends `nativeEvent.text`                                              |
| Slim CLAUDE.md    | Architecture moved to `docs/architecture.md`, design spec to `docs/design/README.md`, so every session loads less context                |
| App icon          | Icon, splash colour, web favicon, and a CI step that checks the Expo native config                                                       |
| Mobile splash     | Animated intro (Reanimated 4) with a radar sweep and frequency tuner; full on first launch, short after; the one approved gradient       |
| UI tidy           | Remove the unused `ComponentPreview`, a small `Button` size for Join in list rows                                                        |
| Dev seed          | See below                                                                                                                                |
| Quick tour        | README screenshots on web, iOS and Android in light and dark, a quick start block                                                        |

Each bug fix started with a test that reproduced the bug.

## 4. Dev seed plan (`pnpm db:seed`)

- Runs as a Nest application context (no HTTP server) and **reuses the services** (`UsersService`, `RoomsService.create/join/leave`), so `memberCount` and other derived fields stay correct.
- Messages are the exception: they're inserted directly with a backdated `createdAt` and a matching ObjectId, so history spans several days.
- Seed data is validated with the shared Zod schemas before anything is written; the collections are emptied with `deleteMany` (indexes kept); it refuses to run in production.
- 8 stations and 7 nets, each showing one case: pagination over 3 days, runs from one sender, short previews, an open net to join, an empty net kept with its history, a net with no messages, a long name and a long message.
