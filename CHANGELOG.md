# Changelog

One short line per commit, newest first.

## Unreleased

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
