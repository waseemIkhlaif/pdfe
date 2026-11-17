import type { PoolClient } from 'pg';

export interface ConfigVersionRow {
  id: string;
  key: string;
  version: number;
  value: unknown;
  effective_from: Date;
  status: string;
  approval_request_id: string | null;
  rollback_of_version: number | null;
  reason: string | null;
  tenant_id: string | null;
  created_by: string;
  created_at: Date;
}

export const VERSION_COLUMNS = `id, key, version, value, effective_from, status, approval_request_id, rollback_of_version,
  reason, tenant_id, created_by, created_at`;

/** Serialises changes to one setting: held until the transaction ends. */
export async function lockConfigKey(client: PoolClient, key: string): Promise<void> {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`config:${key}`]);
}

/**
 * Makes a version the active one: the previous active version becomes `superseded`, and every other version still
 * waiting for approval becomes `stale` (it was proposed against a value that is no longer current). Runs in the caller's
 * transaction, with the key locked. Used by the API when an approval completes and by the worker when a scheduled version
 * falls due, so both do exactly the same thing.
 */
export async function activateVersion(
  client: PoolClient,
  versionId: string,
): Promise<{ key: string; version: number; previousVersion: number | null; staled: number }> {
  const v = await client.query<{ key: string; version: number }>(
    'SELECT key, version FROM config.config_versions WHERE id = $1',
    [versionId],
  );
  const row = v.rows[0];
  if (!row) throw new Error(`config version ${versionId} does not exist`);
  await lockConfigKey(client, row.key);
  const prev = await client.query<{ version: number }>(
    `UPDATE config.config_versions SET status = 'superseded'
      WHERE key = $1 AND status = 'active' AND id <> $2 RETURNING version`,
    [row.key, versionId],
  );
  await client.query("UPDATE config.config_versions SET status = 'active' WHERE id = $1", [
    versionId,
  ]);
  const stale = await client.query(
    `UPDATE config.config_versions SET status = 'stale'
      WHERE key = $1 AND status = 'pending_approval' AND id <> $2`,
    [row.key, versionId],
  );
  return {
    key: row.key,
    version: row.version,
    previousVersion: prev.rows[0]?.version ?? null,
    staled: stale.rowCount ?? 0,
  };
}
