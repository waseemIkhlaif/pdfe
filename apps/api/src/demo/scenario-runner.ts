import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PoolClient } from 'pg';
import {
  configKeys,
  configRegistry,
  sodViolations,
  type ConfigKey,
  type ScenarioManifest,
} from '@pdfe/domain-types';
import {
  AppError,
  IdGenerator,
  ScenarioClock,
  SeededRandom,
  SystemRandom,
  canonicalJson,
  type ClockService,
} from '@pdfe/platform-core';
import { AnchorRecorder, AuditRecorder } from '@pdfe/platform-core/audit';
import type { Pool } from '@pdfe/platform-core/db';
import { CLOCK, PG_POOL } from '../core/tokens';
import { collectDigestInput, computeDigest, DIGEST_TABLES } from './digest';
import { DeterminismViolation, installTripwire, runDeterministic } from './determinism-tripwire';
import { MockHubControl } from './mock-hub-control';
import { ScenarioRegistry } from './scenario-registry';

/**
 * Called after each step of a run. It does nothing in production. Tests replace it to inject a fault at a chosen point
 * (a failure after the users exist must leave the tables reset), or to call something the tripwire should catch.
 */
@Injectable()
export class ScenarioHooks {
  async afterStep(
    _step: 'started' | 'reset' | 'tenants' | 'users' | 'config' | 'hub',
  ): Promise<void> {}
}

const ACTOR = 'system:scenario';

/** The demo-resettable tables, in the order of the contract. One statement, so foreign keys between them do not matter. */
const RESET_TABLES = [
  'integration.outbox',
  'integration.idempotency_keys',
  'integration.inbox',
  'iam.tenant_elevations',
  'iam.approval_decisions',
  'config.config_versions',
  'iam.approval_requests',
  'iam.user_roles',
  'iam.users',
  'platform.organizations',
  'platform.legal_entities',
  'platform.tenants',
];

export interface RunInput {
  code: string;
  version: string;
  seed: number;
  requestedBy: string;
  correlationId: string;
}

export interface RunView {
  id: string;
  scenario_code: string;
  manifest_version: string;
  seed: number;
  status: 'running' | 'succeeded' | 'failed';
  started_at: string;
  finished_at: string | null;
  result_digest: string | null;
  error_code: string | null;
  report: Report | null;
  requested_by: string;
  correlation_id: string;
}

export interface Report {
  tables: Record<string, { count: number; ids: string[] }>;
  audit_events: number;
  epoch_anchor: { id: string; up_to_seq: number };
  mock_hub: 'configured' | 'skipped';
}

interface RunRow {
  id: string;
  scenario_code: string;
  manifest_version: string;
  seed: string;
  status: RunView['status'];
  started_at: Date;
  finished_at: Date | null;
  result_digest: string | null;
  error_code: string | null;
  report: Report | null;
  requested_by: string;
  correlation_id: string;
}

const toView = (r: RunRow): RunView => ({
  id: r.id,
  scenario_code: r.scenario_code,
  manifest_version: r.manifest_version,
  seed: Number(r.seed),
  status: r.status,
  started_at: r.started_at.toISOString(),
  finished_at: r.finished_at?.toISOString() ?? null,
  result_digest: r.result_digest,
  error_code: r.error_code,
  report: r.report,
  requested_by: r.requested_by,
  correlation_id: r.correlation_id,
});

const COLUMNS = `id, scenario_code, manifest_version, seed, status, started_at, finished_at, result_digest, error_code, report,
  requested_by, correlation_id`;

/**
 * Resets the demo data and seeds it from a manifest, the same way every time for the same seed (FR-035, SC-010).
 *
 *  1. The mode, the manifest and its checksum are checked, and a `running` row is inserted (one run at a time: the
 *     database refuses a second `running` row).
 *  2. A first transaction truncates the demo-resettable tables as `demo_reset_role` and commits: the environment is in the
 *     reset state from here on, whatever happens next.
 *  3. A second transaction, inside the determinism tripwire, seeds from a scenario clock and a seeded ID generator, records
 *     an `epoch_start` anchor, writes every entity with its normal audit event, configures the mock hub, computes the
 *     digest and commits. A failure rolls this transaction back and leaves the tables as step 2 left them (empty).
 *  4. The run row is updated: `succeeded` with the digest and the report, or `failed` with an error code.
 *
 * Every ID, timestamp and random value of step 3 comes from the injected sources. Entities are written by this seeder with
 * the same rules the services apply (separation of duties checked before a grant; the database trigger is the backstop),
 * attributed to `system:scenario`, because nobody is signed in to approve anything.
 */
@Injectable()
export class ScenarioRunner {
  private readonly log = new Logger('scenario');

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(CLOCK) private readonly wall: ClockService,
    private readonly registry: ScenarioRegistry,
    private readonly hub: MockHubControl,
    private readonly hooks: ScenarioHooks,
  ) {
    installTripwire();
  }

  async get(id: string): Promise<RunView> {
    const r = await this.pool.query<RunRow>(
      `SELECT ${COLUMNS} FROM demo.scenario_runs WHERE id = $1`,
      [id],
    );
    if (!r.rows[0]) throw new AppError('NOT_FOUND', 404);
    return toView(r.rows[0]);
  }

  async run(input: RunInput): Promise<RunView> {
    if ((process.env.APP_MODE ?? 'DEMO') !== 'DEMO') throw new AppError('FORBIDDEN', 403);
    const loaded = await this.registry.verified(input.code, input.version);
    const manifest = loaded.manifest;

    // The history row has its own ID, from the system sources: it is not part of the run.
    const runId = new IdGenerator(this.wall, new SystemRandom()).next();
    try {
      await this.pool.query(
        `INSERT INTO demo.scenario_runs
           (id, scenario_code, seed, manifest_version, started_at, status, requested_by, correlation_id)
         VALUES ($1,$2,$3,$4,$5,'running',$6,$7)`,
        [
          runId,
          input.code,
          input.seed,
          input.version,
          this.wall.now().toISOString(),
          input.requestedBy,
          input.correlationId,
        ],
      );
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw new AppError('RUN_IN_PROGRESS', 409);
      throw err;
    }

    try {
      const out = await this.execute(manifest, input.seed);
      await this.pool.query(
        `UPDATE demo.scenario_runs SET status = 'succeeded', finished_at = $2, result_digest = $3, report = $4
          WHERE id = $1`,
        [runId, this.wall.now().toISOString(), out.digest, JSON.stringify(out.report)],
      );
    } catch (err) {
      this.log.error(`run ${runId} failed: ${(err as Error).message}`);
      const code =
        err instanceof DeterminismViolation
          ? 'DETERMINISM_BYPASS'
          : err instanceof AppError
            ? err.code
            : 'RUN_FAILED';
      await this.pool.query(
        `UPDATE demo.scenario_runs SET status = 'failed', finished_at = $2, error_code = $3 WHERE id = $1`,
        [runId, this.wall.now().toISOString(), code],
      );
    }
    return this.get(runId);
  }

  private async reset(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE demo_reset_role');
      await client.query(`TRUNCATE ${RESET_TABLES.join(', ')}`);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  private async execute(
    manifest: ScenarioManifest,
    seed: number,
  ): Promise<{ digest: string; report: Report }> {
    return runDeterministic(async () => {
      const clock = new ScenarioClock(manifest.clock.base, manifest.clock.step_ms);
      const ids = new IdGenerator(clock, new SeededRandom(seed));
      // The audit trail is append-only and outlives every run, so its row IDs must not repeat when a seed is reused: they
      // come from the scenario clock and system randomness, and are left out of the digest (like seq and the hashes).
      const auditIds = new IdGenerator(clock, new SystemRandom());
      const audit = new AuditRecorder(clock, auditIds);
      const anchors = new AnchorRecorder(clock, auditIds);
      const correlationId = `COR-${ids.next()}`;
      const stamp = (): string => {
        clock.tick();
        return clock.now().toISOString();
      };

      await this.hooks.afterStep('started');
      await this.reset();
      await this.hooks.afterStep('reset');

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('app.correlation_id', $1, true)", [correlationId]);
        const tenant = (id: string) =>
          client.query("SELECT set_config('app.tenant_id', $1, true)", [id]);
        const tenantIds = new Map(manifest.tenants.map((t) => [t.code, t.id]));
        const created: Record<string, string[]> = Object.fromEntries(
          DIGEST_TABLES.map((t) => [t, []]),
        );

        const anchor = await anchors.record(
          { client },
          { kind: 'epoch_start', epochLabel: `${manifest.code}-${manifest.version}-seed${seed}` },
        );
        await audit.record(
          { client },
          {
            actorRole: ACTOR,
            action: 'scenario.run_started',
            targetType: 'scenario',
            targetId: `${manifest.code}:${manifest.version}`,
            reason: 'demo reset and seed',
            correlationId,
            data: { seed, manifest_version: manifest.version },
          },
        );

        for (const t of manifest.tenants) {
          await client.query(
            `INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ($1,$2,$3,$4,$5)`,
            [t.id, t.code, t.name, t.kind, stamp()],
          );
          created['platform.tenants']!.push(t.id);
          await audit.record(
            { client },
            {
              tenantId: t.id,
              actorRole: ACTOR,
              action: 'tenant.created',
              targetType: 'tenant',
              targetId: t.id,
              correlationId,
              data: { code: t.code },
            },
          );
        }
        for (const o of manifest.organizations) {
          const tenantId = tenantIds.get(o.tenant)!;
          await tenant(tenantId);
          const id = ids.next();
          await client.query(
            `INSERT INTO platform.organizations (id, tenant_id, type, display_name, created_at)
             VALUES ($1,$2,$3,$4,$5)`,
            [id, tenantId, o.type, o.display_name, stamp()],
          );
          created['platform.organizations']!.push(id);
          await audit.record(
            { client },
            {
              tenantId,
              actorRole: ACTOR,
              action: 'organization.created',
              targetType: 'organization',
              targetId: id,
              correlationId,
            },
          );
        }
        await this.hooks.afterStep('tenants');

        for (const u of manifest.users) {
          const tenantId = tenantIds.get(u.tenant)!;
          await tenant(tenantId);
          await client.query(
            `INSERT INTO iam.users (id, tenant_id, external_subject, display_name, created_at)
             VALUES ($1,$2,$3,$4,$5)`,
            [u.subject, tenantId, u.subject, u.display_name, stamp()],
          );
          created['iam.users']!.push(u.subject);
          await audit.record(
            { client },
            {
              tenantId,
              actorRole: ACTOR,
              action: 'user.created',
              targetType: 'user',
              targetId: u.subject,
              correlationId,
              data: { display_name: u.display_name },
            },
          );
          const held: string[] = [];
          for (const role of u.roles) {
            const v = sodViolations(held, role);
            if (v.conflicts.length || v.triple) {
              throw new AppError('SOD_CONFLICT', 409);
            }
            await client.query(
              'INSERT INTO iam.user_roles (user_id, role_code, granted_at) VALUES ($1,$2,$3)',
              [u.subject, role, stamp()],
            );
            held.push(role);
            created['iam.user_roles']!.push(`${u.subject}:${role}`);
            await audit.record(
              { client },
              {
                tenantId,
                actorRole: ACTOR,
                action: 'iam.role.granted',
                targetType: 'user',
                targetId: u.subject,
                reason: 'scenario seed',
                correlationId,
                data: { role_code: role },
              },
            );
          }
        }
        await this.hooks.afterStep('users');

        await this.seedConfig(client, manifest, ids, clock, audit, correlationId, created);
        await this.hooks.afterStep('config');

        const hub = await this.hub.configure({ seed, entries: manifest.mock_hub });
        await this.hooks.afterStep('hub');

        // The digest covers everything above. The finish event and the outbox event come after it (they carry it).
        const input = await collectDigestInput(
          client,
          correlationId,
          anchor.upToSeq,
          manifest.tenants.map((t) => t.id),
        );
        const digest = computeDigest(input);
        const platformTenant =
          manifest.tenants.find((t) => t.kind === 'platform') ?? manifest.tenants[0]!;
        await audit.record(
          { client },
          {
            tenantId: platformTenant.id,
            actorRole: ACTOR,
            action: 'scenario.run_finished',
            targetType: 'scenario',
            targetId: `${manifest.code}:${manifest.version}`,
            correlationId,
            data: { seed, digest },
          },
        );
        await tenant(platformTenant.id);
        await client.query(
          `INSERT INTO integration.outbox (id, tenant_id, topic, payload, correlation_id, created_at)
           VALUES ($1,$2,'scenario.run.finished',$3,$4,$5)`,
          [
            ids.next(),
            platformTenant.id,
            JSON.stringify({
              scenario_code: manifest.code,
              version: manifest.version,
              seed,
              digest,
            }),
            correlationId,
            stamp(),
          ],
        );
        await client.query('COMMIT');

        const report: Report = {
          tables: Object.fromEntries(
            Object.entries(created).map(([t, list]) => [
              t,
              { count: list.length, ids: [...list].sort() },
            ]),
          ),
          audit_events: input.audit.length + 1,
          epoch_anchor: { id: anchor.id, up_to_seq: anchor.upToSeq },
          mock_hub: hub,
        };
        return { digest, report };
      } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw err;
      } finally {
        client.release();
      }
    });
  }

  /** Version 1 of every setting, active at once: the manifest's value, or the registry default. */
  private async seedConfig(
    client: PoolClient,
    manifest: ScenarioManifest,
    ids: IdGenerator,
    clock: ScenarioClock,
    audit: AuditRecorder,
    correlationId: string,
    created: Record<string, string[]>,
  ): Promise<void> {
    const overrides = new Map(manifest.config.map((c) => [c.key, c.value]));
    await client.query("SELECT set_config('app.tenant_id', '', true)");
    for (const key of configKeys as ConfigKey[]) {
      const item = configRegistry[key];
      const value = overrides.has(key) ? overrides.get(key) : item.default;
      clock.tick();
      const at = clock.now().toISOString();
      const id = ids.next();
      await client.query(
        `INSERT INTO config.config_versions
           (id, key, version, value, effective_from, status, reason, created_by, created_at)
         VALUES ($1,$2,1,$3,$4,'active','scenario baseline',$5,$4)`,
        [id, key, canonicalJson(value), at, ACTOR],
      );
      created['config.config_versions']!.push(id);
      await audit.record(
        { client },
        {
          actorRole: ACTOR,
          action: 'config.activated',
          targetType: 'config_item',
          targetId: key,
          reason: 'scenario baseline',
          correlationId,
          data: { key, version: 1, previous_version: null, effective_from: at },
        },
      );
    }
  }
}
