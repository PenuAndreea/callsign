import { fileURLToPath } from 'node:url';

/**
 * Resolve settings for rendering React Native code through react-native-web, shared by the
 * web app (Vite + Vitest) and the UI package tests (Vitest).
 */
export const reactNativeWebResolve = {
  alias: [
    { find: /^react-native$/, replacement: 'react-native-web' },
    // Use the ES build: its relative imports go through Vite, which picks the `.web.js` files.
    // The CommonJS build would `require()` the native files and React Native's Flow source.
    {
      find: /^react-native-svg$/,
      replacement: fileURLToPath(import.meta.resolve('react-native-svg/lib/module/index.js')),
    },
    // Same for safe areas: the CommonJS build `require()`s the native views.
    {
      find: /^react-native-safe-area-context$/,
      replacement: fileURLToPath(
        import.meta.resolve('react-native-safe-area-context/lib/module/index.js'),
      ),
    },
  ],
  extensions: ['.web.tsx', '.web.ts', '.tsx', '.ts', '.web.js', '.js', '.json'],
};

/**
 * Vite dev: the dependency pre-bundler resolves files inside node_modules on its own, so it
 * needs the `.web.js`-first extension order too (otherwise react-native-svg pulls in Flow source).
 */
export const reactNativeWebOptimizeDeps = {
  rolldownOptions: { resolve: { extensions: reactNativeWebResolve.extensions } },
};

/** Vitest: transform these like source code so their imports get the aliases above. */
export const reactNativeWebInlineDeps = ['react-native-svg', 'react-native-safe-area-context'];
