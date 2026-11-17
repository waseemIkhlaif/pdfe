import type { PoolClient } from 'pg';
import { canonicalJson, sha256Hex } from '@pdfe/platform-core';

/**
 * The digest of a scenario run (contracts/scenario-manifest.md, step 4): every row the run created in the demo-resettable
 * tables, plus the run's own audit events with `seq`, `prev_hash` and `hash` left out (those depend on what the chain held
 * before the run, which a digest must not). Rows are sorted by table and then by their canonical form, serialized as
 * canonical JSON, and hashed with SHA-256.
 */
export const DIGEST_TABLES = [
  'platform.tenants',
  'platform.organizations',
  'iam.users',
  'iam.user_roles',
  'config.config_versions',
] as const;

/** Audit columns that depend on the chain or are identity only (the trail outlives runs, so its IDs cannot repeat). */
const CHAIN_COLUMNS = ['seq', 'prev_hash', 'hash', 'id'];

export interface DigestInput {
  tables: Record<string, Record<string, unknown>[]>;
  audit: Record<string, unknown>[];
}

const byCanonical = (rows: Record<string, unknown>[]): Record<string, unknown>[] =>
  rows
    .map((r) => [canonicalJson(r), r] as const)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([, r]) => r);

export function computeDigest(input: DigestInput): string {
  const doc = {
    tables: Object.fromEntries(
      Object.keys(input.tables)
        .sort()
        .map((t) => [t, byCanonical(input.tables[t]!)]),
    ),
    audit: byCanonical(input.audit),
  };
  return sha256Hex(canonicalJson(doc));
}

/**
 * Reads what the run created. `to_jsonb` renders every value the same way on any machine once the session time zone is
 * fixed (it is, to UTC, for the transaction). `scenario.run_finished` is left out because it carries the digest itself.
 * The audit events are this run's own: its correlation ID, after the epoch anchor (a reused seed gives the same ID).
 * The tables are read through the caller's transaction, with tenant row security applied per tenant by the caller.
 */
export async function collectDigestInput(
  client: PoolClient,
  correlationId: string,
  afterSeq: number,
  tenantIds: readonly string[],
): Promise<DigestInput> {
  await client.query("SET LOCAL TIME ZONE 'UTC'");
  const tables: DigestInput['tables'] = {};
  for (const t of DIGEST_TABLES) tables[t] = [];
  for (const tenantId of tenantIds) {
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    for (const t of DIGEST_TABLES) {
      const r = await client.query<{ j: Record<string, unknown> }>(
        `SELECT to_jsonb(x) AS j FROM ${t} x`,
      );
      for (const row of r.rows) tables[t]!.push(row.j);
    }
  }
  // Platform-scoped tables have no row security, so tenants and configuration are read once per tenant above; keep each
  // row once.
  for (const t of DIGEST_TABLES) {
    const seen = new Set<string>();
    tables[t] = tables[t]!.filter((r) => {
      const k = canonicalJson(r);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  await client.query("SELECT set_config('app.tenant_id', '', true)");
  const audit = await client.query<{ j: Record<string, unknown> }>(
    `SELECT to_jsonb(a) AS j FROM audit.audit_events a
      WHERE correlation_id = $1 AND seq > $2 AND action <> 'scenario.run_finished'`,
    [correlationId, afterSeq],
  );
  return {
    tables,
    audit: audit.rows.map((r) => {
      const j = { ...r.j };
      for (const c of CHAIN_COLUMNS) delete j[c];
      return j;
    }),
  };
}
