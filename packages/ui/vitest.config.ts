import {
  reactNativeWebInlineDeps,
  reactNativeWebResolve,
  testTimeEnv,
} from '@callsign/config/vite';
import { defineConfig } from 'vitest/config';

// Components are written against `react-native`; tests render them through react-native-web,
// the same way the web app does.
export default defineConfig({
  resolve: reactNativeWebResolve,
  define: { __DEV__: 'true' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    env: testTimeEnv,
    server: { deps: { inline: reactNativeWebInlineDeps } },
  },
});
