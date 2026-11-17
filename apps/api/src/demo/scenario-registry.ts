import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { parse } from 'yaml';
import { parseScenarioManifest, type ScenarioManifest } from '@pdfe/domain-types';
import { AppError, type ClockService } from '@pdfe/platform-core';
import type { Pool } from '@pdfe/platform-core/db';
import { CLOCK, PG_POOL } from '../core/tokens';

export const SCENARIOS_DIR = Symbol('SCENARIOS_DIR');

/** Where the manifests are: `SCENARIOS_DIR`, or `db/seeds/scenarios` under the working directory or the repository root. */
export function defaultScenariosDir(env: NodeJS.ProcessEnv = process.env): string {
  if (env.SCENARIOS_DIR) return resolve(env.SCENARIOS_DIR);
  const candidates = [
    resolve(process.cwd(), 'db/seeds/scenarios'),
    resolve(process.cwd(), '../../db/seeds/scenarios'),
  ];
  return candidates.find((c) => existsSync(c)) ?? candidates[0]!;
}

export interface LoadedScenario {
  manifest: ScenarioManifest;
  /** SHA-256 of the file as it is now. */
  sha256: string;
  /** What `SHA256SUMS` lists for it, if anything. */
  listed: string | undefined;
}

const sha256 = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');

/** The lines of `SHA256SUMS` (`<hash>  <path relative to the scenarios folder>`), as a map. */
function readSums(dir: string): Map<string, string> {
  const file = join(dir, 'SHA256SUMS');
  const out = new Map<string, string>();
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([0-9a-f]{64}) [ *](.+)$/.exec(line.trim());
    if (m) out.set(m[2]!.replace(/\\/g, '/'), m[1]!);
  }
  return out;
}

/**
 * The scenario manifests. At start it registers each one in `demo.scenarios` with the hash `SHA256SUMS` lists for it, and
 * marks runs that were still `running` when the last process stopped as failed. A run re-reads the file and refuses when
 * its hash is not the registered one (`MANIFEST_CHECKSUM_MISMATCH`): a manifest cannot change without the list changing
 * with it, and the list is reviewed.
 */
@Injectable()
export class ScenarioRegistry implements OnApplicationBootstrap {
  private readonly log = new Logger('scenarios');

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(CLOCK) private readonly clock: ClockService,
    @Inject(SCENARIOS_DIR) private readonly dir: string,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.register();
    } catch (err) {
      // The database may not be reachable or migrated yet (tests without one, fast development mode): runs then fail clearly.
      this.log.warn(`scenarios were not registered: ${(err as Error).message}`);
    }
  }

  /** Every manifest on disk, as [code, version, relative path]. */
  list(): { code: string; version: string; rel: string }[] {
    if (!existsSync(this.dir)) return [];
    const out: { code: string; version: string; rel: string }[] = [];
    for (const code of readdirSync(this.dir, { withFileTypes: true })) {
      if (!code.isDirectory()) continue;
      for (const f of readdirSync(join(this.dir, code.name))) {
        const m = /^(v[0-9]+)\.yaml$/.exec(f);
        if (m) out.push({ code: code.name, version: m[1]!, rel: `${code.name}/${f}` });
      }
    }
    return out.sort((a, b) => a.rel.localeCompare(b.rel));
  }

  /** Reads and validates one manifest from disk. */
  load(code: string, version: string): LoadedScenario {
    const entry = this.list().find((e) => e.code === code && e.version === version);
    if (!entry) throw new AppError('NOT_FOUND', 404);
    const bytes = readFileSync(join(this.dir, entry.rel));
    const manifest = parseScenarioManifest(parse(bytes.toString('utf8')));
    if (manifest.code !== code || manifest.version !== version) {
      throw new Error(`${entry.rel}: the manifest says ${manifest.code} ${manifest.version}`);
    }
    return { manifest, sha256: sha256(bytes), listed: readSums(this.dir).get(entry.rel) };
  }

  async register(): Promise<void> {
    await this.pool.query(
      `UPDATE demo.scenario_runs SET status = 'failed', error_code = 'ABANDONED', finished_at = $1
        WHERE status = 'running'`,
      [this.clock.now().toISOString()],
    );
    for (const e of this.list()) {
      let loaded: LoadedScenario;
      try {
        loaded = this.load(e.code, e.version);
      } catch (err) {
        this.log.error(`${e.rel} is not a valid manifest: ${(err as Error).message}`);
        continue;
      }
      if (loaded.listed !== loaded.sha256) {
        this.log.error(`${e.rel} does not match SHA256SUMS: runs of it will be refused`);
      }
      await this.pool.query(
        `INSERT INTO demo.scenarios (code, manifest_version, title, manifest_sha256) VALUES ($1,$2,$3,$4)
         ON CONFLICT (code, manifest_version) DO UPDATE SET title = EXCLUDED.title,
           manifest_sha256 = EXCLUDED.manifest_sha256`,
        [e.code, e.version, JSON.stringify(loaded.manifest.title), loaded.listed ?? loaded.sha256],
      );
    }
  }

  /**
   * The manifest for a run, after the checks: it exists (404), it is registered, and its hash is the registered one and the
   * listed one (409 `MANIFEST_CHECKSUM_MISMATCH`).
   */
  async verified(code: string, version: string): Promise<LoadedScenario> {
    const loaded = this.load(code, version);
    const reg = await this.pool.query<{ manifest_sha256: string }>(
      'SELECT manifest_sha256 FROM demo.scenarios WHERE code = $1 AND manifest_version = $2',
      [code, version],
    );
    const registered = reg.rows[0]?.manifest_sha256;
    if (!registered || registered !== loaded.sha256 || loaded.listed !== loaded.sha256) {
      throw new AppError('MANIFEST_CHECKSUM_MISMATCH', 409);
    }
    return loaded;
  }

  async catalog() {
    const rows = await this.pool.query<{
      code: string;
      manifest_version: string;
      title: { en: string; ar: string };
      manifest_sha256: string;
    }>(
      'SELECT code, manifest_version, title, manifest_sha256 FROM demo.scenarios ORDER BY code, manifest_version',
    );
    return {
      items: rows.rows.map((r) => ({
        code: r.code,
        version: r.manifest_version,
        title: r.title,
        manifest_sha256: r.manifest_sha256,
      })),
    };
  }
}
