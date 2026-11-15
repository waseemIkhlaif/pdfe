// Shared Vitest settings. fast-check runs fewer cases when CI_REDUCED=1 (see fcRuns in src/index.ts).
export const unitConfig = {
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/**/*.int.test.ts', 'node_modules/**'],
    testTimeout: 30000,
  },
};
export const intConfig = {
  test: {
    include: ['test/**/*.int.test.ts'],
    testTimeout: 120000,
    hookTimeout: 180000,
    fileParallelism: false,
  },
};
