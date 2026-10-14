import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const RAW_COLOR = '/^(#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\()/';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.turbo/**', '**/.expo/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      'max-lines': ['error', { max: 300 }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${RAW_COLOR}]`,
          message: 'Use a token from @callsign/theme instead of a raw color.',
        },
      ],
    },
  },
  {
    // The theme package is the only place raw color values may live.
    files: ['packages/theme/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  prettier,
);
