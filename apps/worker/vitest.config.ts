import { defineConfig } from 'vitest/config';

// NestJS needs decorator metadata (design:paramtypes), so the transformer must emit it.
const oxc = { decorator: { legacy: true, emitDecoratorMetadata: true } };

export default defineConfig({
  oxc,
  test: {
    include: ['test/**/*.spec.ts'],
    exclude: ['test/**/*.int.spec.ts', 'node_modules/**'],
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
