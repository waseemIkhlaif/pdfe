import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pdfe from './eslint/index.js';

export default [
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/node_modules/**',
      'docs/**',
      'specs/**',
      'scripts/design/**',
      'packages/design-tokens/**',
      'scripts/safety/tests/fixtures/**',
      '**/coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  {
    plugins: { pdfe },
    rules: { 'pdfe/no-nondeterminism': 'error' },
  },
  {
    files: [
      'apps/web-*/**/*.{ts,tsx}',
      'apps/mobile/**/*.{ts,tsx}',
      'packages/ui-web/src/**/*.{ts,tsx}',
      'packages/ui-native/src/**/*.{ts,tsx}',
    ],
    rules: { 'pdfe/no-physical-css': 'error', 'pdfe/no-hardcoded-ui-string': 'error' },
  },
  {
    files: ['**/test/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*', 'scripts/**'],
    rules: { 'pdfe/no-nondeterminism': 'off', '@typescript-eslint/no-explicit-any': 'off' },
  },
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
];
