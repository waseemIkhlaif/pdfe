import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pdfe from './eslint/index.js';

export default [
  { ignores: ['**/dist/**', '**/.next/**', '**/.turbo/**', '**/node_modules/**', 'docs/**', 'specs/**', 'scripts/design/render/site/**', '**/coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { pdfe },
    rules: { 'pdfe/no-nondeterminism': 'error' },
  },
  {
    files: ['apps/web-*/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}', 'packages/ui-web/src/**/*.{ts,tsx}', 'packages/ui-native/src/**/*.{ts,tsx}'],
    rules: { 'pdfe/no-physical-css': 'error', 'pdfe/no-hardcoded-ui-string': 'error' },
  },
  {
    files: ['**/test/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*'],
    rules: { 'pdfe/no-nondeterminism': 'off', '@typescript-eslint/no-explicit-any': 'off' },
  },
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
];
