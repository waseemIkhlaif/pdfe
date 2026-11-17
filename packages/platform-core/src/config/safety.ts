import pg from 'pg';
import { AuditRecorder } from '../audit/recorder';
import { SystemClock } from '../clock';
import { IdGenerator } from '../ids';
import { SystemRandom } from '../random';
import { StartupRefusedError } from '../startup-guard';

/** The three safety-locked settings as the database holds them (`null` when there is no active version). */
export interface SafetyRows {
  mode: unknown;
  allowlist: unknown;
  internalHosts: unknown;
}

type Env = Record<string, string | undefined>;

const hostSet = (list: readonly string[]): Set<string> =>
  new Set(list.map((h) => h.trim().toLowerCase()).filter(Boolean));

/** Does an adapter type pass an allowlist pattern (`mock:*` allows every mock type, `mock:bank` exactly that one)? */
const allowed = (type: string, patterns: readonly string[]): boolean =>
  patterns.some((p) => p === type || (p.endsWith(':*') && type.startsWith(p.slice(0, -1))));

/**
 * What differs between the deployment (environment variables and the adapter configuration) and the safety-locked rows
 * in the database (FR-010). Empty when they agree. The locked rows cannot be changed through the API, so a difference
 * means the environment was changed, or the database was changed behind the API's back: either way the process must not
 * start.
 */
export function safetyProblems(
  rows: SafetyRows,
  env: Env,
  adapterTypes: readonly string[],
): string[] {
  const problems: string[] = [];
  if (rows.mode === null || rows.mode === undefined) {
    problems.push('app.mode has no active value in the database');
  } else if (env.APP_MODE !== rows.mode) {
    problems.push(
      `APP_MODE is ${JSON.stringify(env.APP_MODE ?? null)} but the safety-locked app.mode is ${JSON.stringify(rows.mode)}`,
    );
  }

  if (!Array.isArray(rows.internalHosts)) {
    problems.push('egress.internal_hosts has no active value in the database');
  } else if (env.INTERNAL_HOSTS !== undefined) {
    const expected = hostSet(rows.internalHosts as string[]);
    const actual = hostSet(env.INTERNAL_HOSTS.split(','));
    const extra = [...actual].filter((h) => !expected.has(h));
    const missing = [...expected].filter((h) => !actual.has(h));
    if (extra.length > 0 || missing.length > 0) {
      problems.push(
        `INTERNAL_HOSTS differs from the safety-locked egress.internal_hosts (${[
          extra.length > 0 ? `not allowed: ${extra.join(', ')}` : '',
          missing.length > 0 ? `missing: ${missing.join(', ')}` : '',
        ]
          .filter(Boolean)
          .join('; ')})`,
      );
    }
  }

  if (!Array.isArray(rows.allowlist)) {
    problems.push('adapters.allowlist has no active value in the database');
  } else {
    const patterns = rows.allowlist as string[];
    for (const type of adapterTypes) {
      if (!allowed(type, patterns)) {
        problems.push(
          `adapter type ${type} is not allowed by the safety-locked adapters.allowlist`,
        );
      }
    }
  }
  return problems;
}

/**
 * Compares the environment with the safety-locked rows once the database can be reached, and refuses to start when they
 * differ, recording `system.start_refused` in the audit trail first (the event is the only trace of the refusal that
 * survives the process). When the database cannot be reached, or the configuration tables do not exist yet (migrations
 * not run), there is nothing to compare with: it returns `skipped` and the environment-only checks stand.
 */
export async function assertSafetyAgainstDatabase(opts: {
  url: string;
  env: Env;
  adapterTypes: readonly string[];
}): Promise<'ok' | 'skipped'> {
  const pool = new pg.Pool({ connectionString: opts.url, max: 1, connectionTimeoutMillis: 3_000 });
  let client: pg.PoolClient;
  try {
    client = await pool.connect();
  } catch {
    await pool.end().catch(() => undefined);
    return 'skipped';
  }
  try {
    let rows: SafetyRows;
    try {
      const r = await client.query<{ key: string; value: unknown }>(
        `SELECT key, value FROM config.config_versions
          WHERE status = 'active' AND key IN ('app.mode','adapters.allowlist','egress.internal_hosts')`,
      );
      const by = new Map(r.rows.map((x) => [x.key, x.value]));
      rows = {
        mode: by.get('app.mode') ?? null,
        allowlist: by.get('adapters.allowlist') ?? null,
        internalHosts: by.get('egress.internal_hosts') ?? null,
      };
    } catch {
      return 'skipped'; // no configuration tables yet
    }
    if (rows.mode === null && rows.allowlist === null && rows.internalHosts === null)
      return 'skipped';

    const problems = safetyProblems(rows, opts.env, opts.adapterTypes);
    if (problems.length === 0) return 'ok';

    const clock = new SystemClock();
    const ids = new IdGenerator(clock, new SystemRandom());
    try {
      await client.query('BEGIN');
      await new AuditRecorder(clock, ids).record(
        { client },
        {
          actorRole: 'system:startup',
          action: 'system.start_refused',
          targetType: 'system',
          targetId: 'api',
          reason: 'the environment differs from the safety-locked configuration',
          correlationId: `COR-${ids.next()}`,
          data: { problems },
        },
      );
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK').catch(() => undefined);
      // The refusal matters more than its record: stop all the same.
    }
    throw new StartupRefusedError(
      `the environment differs from the safety-locked configuration: ${problems.join('; ')}.`,
    );
  } finally {
    client.release();
    await pool.end().catch(() => undefined);
  }
}
