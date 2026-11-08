import {
  reactNativeWebInlineDeps,
  reactNativeWebOptimizeDeps,
  reactNativeWebResolve,
  screenTestTimeoutMs,
} from '@callsign/config/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

import { securityHeaders } from './src/securityHeaders';

export default defineConfig({
  plugins: [react()],
  resolve: reactNativeWebResolve,
  optimizeDeps: reactNativeWebOptimizeDeps,
  define: { __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production') },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  // Production build only: the dev server stays without them (see securityHeaders.ts).
  // `preview.proxy` is unset, so it reuses `server.proxy` above.
  preview: { headers: securityHeaders },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: screenTestTimeoutMs,
    server: { deps: { inline: reactNativeWebInlineDeps } },
  },
});
