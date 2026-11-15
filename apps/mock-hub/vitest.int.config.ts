import { defineConfig } from 'vitest/config';

const oxc = { decorator: { legacy: true, emitDecoratorMetadata: true } };

export default defineConfig({
  oxc,
  test: { include: ['test/**/*.int.spec.ts'], testTimeout: 120000, hookTimeout: 180000, fileParallelism: false },
});
