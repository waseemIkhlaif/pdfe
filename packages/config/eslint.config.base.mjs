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
      'packages/contracts/src/clients/**',
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
    // Page code never renders the simulation banner or the shell: only the root layout does (FR-022). A page that
    // imported them could render a second, altered or hidden copy.
    files: ['apps/web-*/app/**/*.{ts,tsx}'],
    ignores: ['apps/web-*/app/[[]locale]/layout.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@pdfe/ui-web',
              importNames: ['SimulationBanner', 'SimShell'],
              message: 'Only the root layout renders the simulation banner (through SimShell).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/test/**', '**/__tests__/**', '**/*.test.*', '**/*.spec.*', 'scripts/**'],
    rules: { 'pdfe/no-nondeterminism': 'off', '@typescript-eslint/no-explicit-any': 'off' },
  },
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
];
