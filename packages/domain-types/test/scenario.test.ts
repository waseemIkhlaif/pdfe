import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseScenarioManifest, scenarioManifestSchema } from '../src/scenario';

// The manifest schema (T161): it accepts the baseline manifest and refuses what would break a run before anything is written.
const BASELINE = resolve(__dirname, '../../../db/seeds/scenarios/baseline/v1.yaml');
const load = (): Record<string, unknown> =>
  parse(readFileSync(BASELINE, 'utf8')) as Record<string, unknown>;
const mutate = (f: (m: any) => void): unknown => {
  const m = load();
  f(m);
  return m;
};
const problems = (raw: unknown): string =>
  scenarioManifestSchema
    .safeParse(raw)
    .error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    .join(' | ') ?? '';

describe('the baseline manifest', () => {
  it('is accepted, with its tenants, one user per role and the mock hub settings', () => {
    const m = parseScenarioManifest(load());
    expect(m).toMatchObject({ code: 'baseline', version: 'v1' });
    expect(m.clock).toEqual({ base: '2026-01-15T08:00:00Z', step_ms: 1000 });
    expect(m.tenants.map((t) => t.code)).toEqual(['platform', 'consumers', 'demo-merchant']);
    expect(m.users).toHaveLength(16);
    expect(new Set(m.users.flatMap((u) => u.roles)).size).toBe(15); // every role of the matrix
    expect(m.mock_hub.length).toBeGreaterThan(0);
  });

  it('has Arabic and English titles', () => {
    const m = parseScenarioManifest(load());
    expect(m.title.en).toBeTruthy();
    expect(m.title.ar).toMatch(/[؀-ۿ]/);
  });
});

describe('the schema refuses', () => {
  it('a tenant reference that does not exist, in a user and in an organization', () => {
    expect(problems(mutate((m) => (m.users[0].tenant = 'nowhere')))).toContain(
      'unknown tenant nowhere',
    );
    expect(problems(mutate((m) => (m.organizations[0].tenant = 'nowhere')))).toContain(
      'unknown tenant nowhere',
    );
  });

  it('a user whose roles conflict (separation of duties), naming both roles', () => {
    const p = problems(mutate((m) => (m.users[0].roles = ['finance_analyst', 'finance_approver'])));
    expect(p).toContain('finance_approver');
    expect(p).toContain('conflicts with finance_analyst');
  });

  it('a duplicate subject, tenant code or tenant id', () => {
    expect(problems(mutate((m) => (m.users[1].subject = m.users[0].subject)))).toContain(
      'duplicate subject',
    );
    expect(problems(mutate((m) => (m.tenants[1].code = m.tenants[0].code)))).toContain(
      'duplicate tenant code',
    );
    expect(problems(mutate((m) => (m.tenants[1].id = m.tenants[0].id)))).toContain(
      'duplicate tenant id',
    );
  });

  it('a money setting that is not a whole number of minor units', () => {
    expect(
      problems(mutate((m) => (m.config = [{ key: 'fees.default_minor', value: 1.5 }]))),
    ).toContain('fees.default_minor');
    expect(
      problems(mutate((m) => (m.config = [{ key: 'limits.transfer_max_minor', value: -1 }]))),
    ).toContain('limits.transfer_max_minor');
  });

  it('a setting that does not exist, is listed twice, or is safety-locked', () => {
    expect(problems(mutate((m) => (m.config = [{ key: 'nope', value: 1 }])))).toContain(
      'unknown setting nope',
    );
    expect(
      problems(
        mutate(
          (m) =>
            (m.config = [
              { key: 'fees.default_minor', value: 1 },
              { key: 'fees.default_minor', value: 2 },
            ]),
        ),
      ),
    ).toContain('listed twice');
    expect(problems(mutate((m) => (m.config = [{ key: 'app.mode', value: 'DEMO' }])))).toContain(
      'safety-locked',
    );
  });

  it('a role that is not in the matrix, a bad clock, and a failure rate above 1', () => {
    expect(problems(mutate((m) => (m.users[0].roles = ['superuser'])))).toContain(
      'users.0.roles.0',
    );
    expect(problems(mutate((m) => (m.clock.base = 'yesterday')))).toContain('clock.base');
    expect(problems(mutate((m) => (m.clock.step_ms = 0)))).toContain('clock.step_ms');
    expect(problems(mutate((m) => (m.mock_hub[0].failure_rate = 2)))).toContain(
      'mock_hub.0.failure_rate',
    );
  });

  it('lists every problem at once, in the thrown message', () => {
    const bad = mutate((m) => {
      m.users[0].tenant = 'nowhere';
      m.config = [{ key: 'fees.default_minor', value: 0.5 }];
    });
    expect(() => parseScenarioManifest(bad)).toThrow(/unknown tenant nowhere.*fees\.default_minor/);
  });
});

describe('the manifest and the realm are the same people', () => {
  it('every user subject exists in the realm generator, with the same tenant and role', async () => {
    const realm = (await import(
      resolve(__dirname, '../../../infra/keycloak/generate-realm.mjs').replace(/\\/g, '/')
    )) as { USERS: { subject: string; tenant: string; role: string }[] };
    const m = parseScenarioManifest(load());
    expect(m.users.map((u) => [u.subject, u.tenant, u.roles[0]])).toEqual(
      realm.USERS.map((u) => [u.subject, u.tenant, u.role]),
    );
  });
});
