import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { 'react-native': 'react-native-web' },
    extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
  },
  define: { __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production') },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
  test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'] },
});
