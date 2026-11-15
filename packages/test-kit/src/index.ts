export { startPostgres, startRedis, createDbRoles } from './containers';
export type { PgHandle, RedisHandle, DbUrls } from './containers';

/** Number of fast-check runs: reduced in CI pull-request mode, full otherwise. */
export const fcRuns = (full = 100): number => (process.env.CI_REDUCED === '1' ? Math.max(10, Math.floor(full / 5)) : full);
