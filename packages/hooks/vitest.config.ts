import { defineConfig } from 'vitest/config';

// No React Native here: hooks only use React and fetch. Tests that render opt into jsdom with
// `// @vitest-environment jsdom`; MSW intercepts Node's fetch in both environments.
export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
  },
});
