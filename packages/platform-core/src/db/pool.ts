import pg from 'pg';

export type Pool = pg.Pool;

/** A connection pool. Types that are timestamps stay strings-free: the driver returns Date objects. */
export function createPool(connectionString: string, max = 10): Pool {
  return new pg.Pool({ connectionString, max });
}
