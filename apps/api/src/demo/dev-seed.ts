import 'reflect-metadata';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sodViolations } from '@pdfe/domain-types';
import {
  IdGenerator,
  ScenarioClock,
  SystemRandom,
  guardStartup,
  type ClockService,
} from '@pdfe/platform-core';
import { AuditRecorder } from '@pdfe/platform-core/audit';
import { createPool, withTx, type Pool } from '@pdfe/platform-core/db';

/**
 * PROVISIONAL development seed (T112). It creates what the realm `pdfe-demo` already knows: the three tenants,
 * the demo organization, and one user per realm demo user with their role. US8 replaces it with the scenario
 * engine (T171), which creates the same entities from a manifest.
 *
 * It runs as `system:seed`: no approval is asked for (nobody is signed in), but the rules are the same. Separation
 * of duties is checked before each grant (the database trigger is the backstop), every creation writes its audit
 * event, and the IDs are the realm's fixed ones, so a seeded user and a realm user are the same person.
 * Running it again changes nothing. DEMO mode only.
 */

export interface SeedUser {
  subject: string;
  username: string;
  role: string;
  tenant: string;
  tenantId: string;
}

export interface SeedInput {
  tenants: Record<string, string>;
  users: SeedUser[];
}

const TENANT_KINDS: Record<string, string> = {
  platform: 'platform',
  consumers: 'consumer_pool',
  'demo-merchant': 'merchant',
};
const TENANT_NAMES: Record<string, string> = {
  platform: 'PDFE Platform (demo)',
  consumers: 'Consumer pool (demo)',
  'demo-merchant': 'Demo Merchant',
};
export const DEMO_ORGANIZATION = { tenant: 'demo-merchant', type: 'merchant', name: 'Demo Cafe' };
const ACTOR = 'system:seed';

export interface SeedResult {
  tenants: number;
  organizations: number;
  users: number;
  roleGrants: number;
}

export async function runDevSeed(
  pool: Pool,
  clock: ClockService & { tick(): void },
  ids: IdGenerator,
  input: SeedInput,
): Promise<SeedResult> {
  const audit = new AuditRecorder(clock, ids);
  const correlationId = `COR-${ids.next()}`;
  const result: SeedResult = { tenants: 0, organizations: 0, users: 0, roleGrants: 0 };
  const stamp = (): string => {
    clock.tick();
    return clock.now().toISOString();
  };

  // Tenants are platform-scoped (no row-level security).
  for (const [code, id] of Object.entries(input.tenants)) {
    await withTx(pool, { correlationId }, async (tx) => {
      const r = await tx.client.query(
        `INSERT INTO platform.tenants (id, code, name, kind, created_at) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO NOTHING`,
        [id, code, TENANT_NAMES[code] ?? code, TENANT_KINDS[code] ?? 'merchant', stamp()],
      );
      if (!r.rowCount) return;
      result.tenants += 1;
      await audit.record(tx, {
        tenantId: id,
        actorRole: ACTOR,
        action: 'tenant.created',
        targetType: 'tenant',
        targetId: id,
        correlationId,
        data: { code },
      });
    });
  }

  const orgTenant = input.tenants[DEMO_ORGANIZATION.tenant];
  if (orgTenant) {
    await withTx(pool, { tenantId: orgTenant, correlationId }, async (tx) => {
      const exists = await tx.client.query(
        'SELECT 1 FROM platform.organizations WHERE display_name = $1',
        [DEMO_ORGANIZATION.name],
      );
      if (exists.rowCount) return;
      const id = ids.next();
      await tx.client.query(
        `INSERT INTO platform.organizations (id, tenant_id, type, display_name, created_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, orgTenant, DEMO_ORGANIZATION.type, DEMO_ORGANIZATION.name, stamp()],
      );
      result.organizations += 1;
      await audit.record(tx, {
        tenantId: orgTenant,
        actorRole: ACTOR,
        action: 'organization.created',
        targetType: 'organization',
        targetId: id,
        correlationId,
      });
    });
  }

  for (const u of input.users) {
    await withTx(pool, { tenantId: u.tenantId, correlationId }, async (tx) => {
      const made = await tx.client.query(
        `INSERT INTO iam.users (id, tenant_id, external_subject, display_name, created_at)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
        [u.subject, u.tenantId, u.subject, u.username, stamp()],
      );
      if (made.rowCount) {
        result.users += 1;
        await audit.record(tx, {
          tenantId: u.tenantId,
          actorRole: ACTOR,
          action: 'user.created',
          targetType: 'user',
          targetId: u.subject,
          correlationId,
          data: { username: u.username },
        });
      }

      const held = (
        await tx.client.query<{ role_code: string }>(
          'SELECT role_code FROM iam.user_roles WHERE user_id = $1',
          [u.subject],
        )
      ).rows.map((r) => r.role_code);
      if (held.includes(u.role)) return;
      const v = sodViolations(held, u.role);
      if (v.conflicts.length || v.triple) {
        throw new Error(
          `seed refused: ${u.username} cannot hold ${u.role} (conflicts: ${v.conflicts.join(', ') || 'triple rule'})`,
        );
      }
      await tx.client.query(
        `INSERT INTO iam.user_roles (user_id, role_code, granted_at) VALUES ($1,$2,$3)`,
        [u.subject, u.role, stamp()],
      );
      result.roleGrants += 1;
      await audit.record(tx, {
        tenantId: u.tenantId,
        actorRole: ACTOR,
        action: 'iam.role.granted',
        targetType: 'user',
        targetId: u.subject,
        reason: 'development seed',
        correlationId,
        data: { role_code: u.role },
      });
    });
  }
  return result;
}

/** The realm generator is the single list of demo users and tenants. */
async function loadRealmInput(): Promise<SeedInput> {
  const file = resolve(process.env.REALM_GENERATOR ?? 'infra/keycloak/generate-realm.mjs');
  const gen = (await import(pathToFileURL(file).href)) as {
    USERS: SeedUser[];
    TENANTS: Record<string, string>;
  };
  return { tenants: gen.TENANTS, users: gen.USERS };
}

async function main(): Promise<void> {
  guardStartup(); // DEMO mode only
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const clock = new ScenarioClock('2026-01-15T08:00:00Z', 1000);
  const ids = new IdGenerator(clock, new SystemRandom());
  const pool = createPool(url, 2);
  try {
    const result = await runDevSeed(pool, clock, ids, await loadRealmInput());
    console.log(JSON.stringify({ msg: 'dev seed done', mode: 'DEMO', ...result }));
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err: unknown) => {
    console.error(`seed:dev failed: ${(err as Error).message}`);
    process.exit(1);
  });
}
