import {
  reactNativeWebInlineDeps,
  reactNativeWebResolve,
  screenTestTimeoutMs,
} from '@callsign/config/vite';
import { defineConfig } from 'vitest/config';

// Screens are written against `react-native`; tests render them through react-native-web,
// like the UI package, and talk to the API through MSW.
export default defineConfig({
  resolve: reactNativeWebResolve,
  define: { __DEV__: 'true' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: screenTestTimeoutMs,
    server: { deps: { inline: reactNativeWebInlineDeps } },
  },
});
