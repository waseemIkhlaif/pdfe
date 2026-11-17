#!/usr/bin/env node
import { resolve } from 'node:path';
import { seedReferenceData } from './reference-data';
import { runMigrations } from './runner';

async function main(): Promise<void> {
  const url = process.env.MIGRATOR_DATABASE_URL;
  if (!url) throw new Error('MIGRATOR_DATABASE_URL is not set');
  const dir = resolve(process.env.MIGRATIONS_DIR ?? 'db/migrations');
  const checkOnly = process.argv.includes('--check');
  const r = await runMigrations({ url, dir, checkOnly });
  console.log(
    JSON.stringify({
      migrations: { applied: r.applied, skipped: r.skipped.length, pending: r.pending },
      checkOnly,
    }),
  );
  if (checkOnly) {
    if (r.pending.length > 0) process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({ referenceData: await seedReferenceData(url) }));
}

main().catch((err: unknown) => {
  console.error(`migrate: ${(err as Error).message}`);
  process.exit(1);
});
