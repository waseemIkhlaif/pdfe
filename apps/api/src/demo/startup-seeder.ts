import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { Pool } from '@pdfe/platform-core/db';
import { PG_POOL } from '../core/tokens';
import { ScenarioRegistry } from './scenario-registry';
import { ScenarioRunner } from './scenario-runner';

/**
 * Seeds an empty demo database at start, so a fresh clone is usable once the stack is healthy: nobody can sign in to ask for a
 * scenario run while there are no demo users. `SEED_ON_EMPTY=<code>:<version>:<seed>` (the Compose file sets
 * `baseline:v1:42`) names the scenario. It does nothing outside DEMO mode, when the variable is not set, or when the database
 * already has tenants (a restart never resets the data). The run is the ordinary one, attributed to `system:startup`.
 */
@Injectable()
export class StartupSeeder implements OnApplicationBootstrap {
  private readonly log = new Logger('seed');

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly registry: ScenarioRegistry,
    private readonly runner: ScenarioRunner,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const spec = process.env.SEED_ON_EMPTY;
    if (!spec || (process.env.APP_MODE ?? 'DEMO') !== 'DEMO') return;
    const m = /^([a-z][a-z0-9-]*):(v[0-9]+):([0-9]+)$/.exec(spec);
    if (!m) {
      this.log.error(`SEED_ON_EMPTY must look like baseline:v1:42 (got ${spec}): not seeding`);
      return;
    }
    try {
      const tenants = await this.pool.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM platform.tenants',
      );
      if ((tenants.rows[0]?.n ?? 0) > 0) return;
      await this.registry.register();
      const run = await this.runner.run({
        code: m[1]!,
        version: m[2]!,
        seed: Number(m[3]),
        requestedBy: 'system:startup',
        correlationId: 'COR-startup-seed',
      });
      if (run.status === 'succeeded') {
        this.log.log(
          `seeded the empty database from ${m[1]} ${m[2]} seed ${m[3]} (digest ${run.result_digest})`,
        );
      } else {
        this.log.error(`the start-up seed failed: ${run.error_code}`);
      }
    } catch (err) {
      // The database may not be reachable or migrated (tests without one): there is nothing to seed.
      this.log.warn(`the start-up seed was skipped: ${(err as Error).message}`);
    }
  }
}
