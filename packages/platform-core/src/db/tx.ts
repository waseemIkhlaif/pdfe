import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PoolClient } from 'pg';
import type { Pool } from './pool';

export interface TxContext {
  /** Tenant for row-level security. Taken from the validated token, or from an active elevation. */
  tenantId?: string;
  correlationId?: string;
  /** Set while a read-only elevation is active. */
  elevationId?: string;
}

export interface TxOptions {
  /** Read-only transaction. Always used under an elevation (FR-013a). */
  readOnly?: boolean;
}

export interface Tx {
  client: PoolClient;
  db: NodePgDatabase;
}

/**
 * Runs fn in one transaction with the request context set as transaction-local settings:
 * app.tenant_id (RLS), app.correlation_id and app.elevation_id. An elevation forces READ ONLY.
 * Commits on success and rolls back on any error.
 */
export async function withTx<T>(
  pool: Pool,
  ctx: TxContext,
  fn: (tx: Tx) => Promise<T>,
  opts: TxOptions = {},
): Promise<T> {
  const client = await pool.connect();
  const readOnly = opts.readOnly === true || ctx.elevationId !== undefined;
  try {
    await client.query(readOnly ? 'BEGIN READ ONLY' : 'BEGIN');
    // set_config(..., true) is the parameterisable form of SET LOCAL.
    await client.query(
      `SELECT set_config('app.tenant_id', $1, true),
              set_config('app.correlation_id', $2, true),
              set_config('app.elevation_id', $3, true)`,
      [ctx.tenantId ?? '', ctx.correlationId ?? '', ctx.elevationId ?? ''],
    );
    const result = await fn({ client, db: drizzle(client) });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
