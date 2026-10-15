# Changelog

One short line per commit, newest first. Each milestone is a release: M0 = 0.1.0, M1 = 0.2.0, and so on; 1.0.0 is the finished v1 scope.

## Unreleased

- feat(ui): Input (form and chat variants, focus and error states) and StatusDot

- fix(ui): visible pressed feedback (push-in scale, sunken back button, no 50 ms web delay)
- feat(ui): Icon (react-native-svg) and IconButton; shared react-native-web Vite settings in @callsign/config
- feat(ui): ThemeProvider, useTheme, createStyles and the Text, Button and Card primitives; fonts and a preview in both apps
- feat(theme): light and dark design tokens with a WCAG contrast test
- docs: new light/dark mockups and a rewritten design brief (tokens, fonts, components, v1 scope)

## 0.1.0 - 2026-10-15 (M0: tooling)

- docs: README with setup, how to run each app, the checks and the data model
- ci: GitHub Actions running format, lint, typecheck, unit and e2e tests and build
- chore: docker-compose MongoDB for local development and API .env.example
- feat(types): shared Zod package built with tsup (ESM + CJS), first schema: callsign
- feat(api): scaffold NestJS app with /api prefix, Jest unit and e2e tests
- feat(web): scaffold Vite app with react-native-web alias, dev proxy and Vitest smoke tests
- chore(config): add react-hooks lint rules and pin shared React versions in a pnpm catalog
- feat(mobile): scaffold Expo app with Expo Router, jest-expo and a first smoke test
- fix(config): set nodeLinker hoisted in pnpm-workspace.yaml (pnpm 12 ignores it in .npmrc)
- chore: enforce Conventional Commits with commitlint
- chore: ESLint, Prettier, strict tsconfig base, Husky + lint-staged pre-commit
- docs: project brief, design mockups and API contract
- chore: pnpm workspaces and Turborepo root setup
