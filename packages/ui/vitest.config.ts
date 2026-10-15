import { defineConfig } from 'vitest/config';

// Components are written against `react-native`; tests render them through react-native-web,
// the same way the web app does.
export default defineConfig({
  resolve: {
    alias: { 'react-native': 'react-native-web' },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
  },
  define: { __DEV__: 'true' },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
});
