import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { sha256Hex } from '../hash';

export interface MigrateOptions {
  /** Connection string of the migrator role (owner of the schemas). */
  url: string;
  /** Directory holding NNNN_name.sql files. */
  dir: string;
  /** Verify applied files and list pending ones, but apply nothing. */
  checkOnly?: boolean;
}

export interface MigrateResult {
  applied: string[];
  skipped: string[];
  pending: string[];
}

export class MigrationError extends Error {
  constructor(
    message: string,
    readonly filename: string,
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Applies db/migrations/*.sql in name order, each file in its own transaction.
 * Each applied file's SHA-256 is recorded, and the runner refuses to run if an applied file has changed
 * (rule: never edit a migration after it has been merged; add a new numbered file instead).
 */
export async function runMigrations(opts: MigrateOptions): Promise<MigrateResult> {
  const files = readdirSync(opts.dir)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
  const client = new pg.Client({ connectionString: opts.url });
  await client.connect();
  const result: MigrateResult = { applied: [], skipped: [], pending: [] };
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS platform');
    await client.query(
      `CREATE TABLE IF NOT EXISTS platform.schema_migrations (
         filename   text PRIMARY KEY,
         sha256     text NOT NULL,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    // Only one runner at a time.
    await client.query('SELECT pg_advisory_lock(hashtext(\'pdfe.migrate\'))');
    const applied = new Map(
      (await client.query<{ filename: string; sha256: string }>('SELECT filename, sha256 FROM platform.schema_migrations')).rows.map(
        (r) => [r.filename, r.sha256],
      ),
    );
    // An applied file that is gone from the directory is also a change of history.
    for (const name of applied.keys()) {
      if (!files.includes(name)) throw new MigrationError(`Applied migration ${name} is missing from ${opts.dir}`, name);
    }
    for (const name of files) {
      const sql = readFileSync(join(opts.dir, name), 'utf8');
      const hash = sha256Hex(sql);
      const known = applied.get(name);
      if (known !== undefined) {
        if (known !== hash) {
          throw new MigrationError(`Migration ${name} was changed after it was applied. Add a new numbered file instead.`, name);
        }
        result.skipped.push(name);
        continue;
      }
      if (opts.checkOnly) {
        result.pending.push(name);
        continue;
      }
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO platform.schema_migrations (filename, sha256) VALUES ($1, $2)', [name, hash]);
        await client.query('COMMIT');
        result.applied.push(name);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new MigrationError(`Migration ${name} failed: ${(err as Error).message}`, name);
      }
    }
    return result;
  } finally {
    await client.end();
  }
}
