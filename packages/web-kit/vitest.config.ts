import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { 'server-only': resolve(__dirname, 'test/stubs/server-only.ts') } },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.tsx'],
    // Process auth-web with Vite so the alias above reaches its `server-only` import.
    server: { deps: { inline: [/@pdfe\/auth-web/] } },
  },
});
