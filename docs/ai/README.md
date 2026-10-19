# How AI was used

Callsign was built with **Claude Code** (Anthropic's coding agent, run from the Claude desktop app) as a pair: the AI planned, explained, implemented in small steps and reviewed; I made the decisions, checked the results and owned every commit, PR and release.

This folder is the record of that work:

- **This file:** the workflow, the guardrails and where the AI needed correcting.
- **[plans/](plans/):** the implementation plan for each milestone, with the options that were on the table and what was chosen.

## The specs the AI worked from

These are written for the agent as much as for people, and are loaded into every session:

| File                                         | What it holds                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [CLAUDE.md](../../CLAUDE.md)                 | Project brief: scope, stack, the rules (strict TS, 300-line files, tests from the start, changelog), conventions, milestones               |
| [docs/architecture.md](../architecture.md)   | Every architecture decision: API modules, auth and tokens, sockets, data model and indexes, shared hooks, error handling, routing, testing |
| [docs/api-contract.md](../api-contract.md)   | The REST and Socket.IO contract, designed before any code                                                                                  |
| [docs/design/README.md](../design/README.md) | Design spec: mockups, tokens, components, screens, what in the mockups is out of scope                                                     |

A private `CLAUDE.local.md` (gitignored) told the agent how I want to work: plan and explain by default, explain backend decisions (my background is React Native, React and Angular), skip frontend basics. A small memory store carried milestone state and working preferences from one session to the next.

## The workflow

Each milestone (and later each PR) followed the same loop:

1. **Plan.** I asked for a plan of the milestone. The agent read the current code and docs, then proposed numbered steps (one commit each) and listed the **decisions with options and a recommendation**.
2. **Decide.** I went through the decisions point by point, asked about the ones I didn't know (often backend: cursor pagination, refresh-token rotation, Socket.IO rooms, MongoDB indexes) and picked. The plans in [plans/](plans/) record those choices.
3. **One step per turn.** The agent implemented one step, then ran format, lint, typecheck, unit and e2e tests and the build, plus a smoke test of the built API on a throwaway database. UI steps were checked visually: web in the browser at 375 px and desktop, iOS Simulator and Android emulator, light and dark.
4. **Review and commit.** I reviewed the diff, asked questions or for changes, and committed. Then "go ahead with step N".
5. **Docs in step.** `CHANGELOG.md` (one line per commit), the architecture doc, the API contract and the README were updated in the same steps, so the specs never drifted from the code.

## Guardrails

- **Rules in [CLAUDE.md](../../CLAUDE.md)**, enforced by tooling rather than trust: ESLint `max-lines: 300`, no `any`, a no-raw-colors rule, strict TypeScript.
- **Husky + lint-staged + commitlint** on every commit, and **CI** (format, lint, typecheck, unit, e2e, build, Expo native config) on every PR.
- **Shared Zod contract** in `packages/types`: the API and both apps validate against the same schemas, so a wrong guess about a shape fails a test.
- **Tests ship with the code**, and bugs found in QA got a failing test before the fix.

## Where the AI needed correcting

The value came as much from the checks as from the generated code. Examples:

- **Library types from memory.** In M4 I asked the agent to re-check all changes against the installed library types. That caught that `io()` is not generic in the way it had assumed, and an uppercase-id bug.
- **Local timings aren't CI timings.** A screen test passed locally (first render 70 ms) and failed on CI (2.3 s). Screen tests now use longer async waits.
- **A design limit it had accepted.** M2 shipped one refresh token per user, which logged out the web app whenever the phone logged in. We fixed it in 0.3.1 with one session per device.
- **PR size.** M5 ended up as ~25 commits on one branch mixing API, shared packages, web and mobile, and it had to be split into five stacked PRs for review. From M6 on the plan proposes the PR split up front, one concern per PR.
- **Honest scope.** For the M6 error handling, the agent pointed out that error boundaries would not have caught any of the four QA bugs, so the plan was reshaped around query and mutation error states instead.

Going the other way, the reviews caught things in my own code. For example, M1 font tokens like `'Stardos Stencil'` with weights work on web but not on native, where each weight is its own family.
