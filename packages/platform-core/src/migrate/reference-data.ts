import pg from 'pg';
import {
  configJsonSchema,
  configKeys,
  configRegistry,
  permissions,
  rolePermissions,
  roles,
  sodConflicts,
} from '@pdfe/domain-types';
import { sha256Hex } from '../hash';

export interface ReferenceDataResult {
  roles: number;
  permissions: number;
  rolePermissions: number;
  sodConflicts: number;
  configItems: number;
  /** Settings that had no version and got version 1, the default. */
  configBootstrapped: number;
}

/** A stable UUID (version 8, custom) for a bootstrap row, so running the seed twice, anywhere, gives the same ID. */
const bootstrapId = (key: string): string => {
  const h = sha256Hex(`pdfe:config:bootstrap:${key}`);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/** The time of bootstrap rows: fixed, because they come from code, not from a moment (determinism, R-13). */
const BOOTSTRAP_TIME = '1970-01-01T00:00:00Z';

/**
 * Upserts iam.roles, iam.permissions, iam.role_permissions and iam.sod_conflicts from rbac.ts, and config.config_items
 * from config-registry.ts (a setting with no version gets version 1, active, with its default, by `system:bootstrap`).
 * Runs on the migrator connection after the migrations, in one transaction, and is idempotent.
 * Rows that are no longer in rbac.ts are removed from the two link tables, so a change to the matrix
 * is a change to the database. Roles and permissions are never deleted here: they may be referenced.
 */
export async function seedReferenceData(url: string): Promise<ReferenceDataResult> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    for (const r of roles) {
      await client.query(
        `INSERT INTO iam.roles (code, privileged) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET privileged = EXCLUDED.privileged`,
        [r.name, r.privileged],
      );
    }
    for (const p of permissions) {
      await client.query(
        `INSERT INTO iam.permissions (code, high_risk) VALUES ($1, $2)
         ON CONFLICT (code) DO UPDATE SET high_risk = EXCLUDED.high_risk`,
        [p.name, p.highRisk],
      );
    }

    const links: [string, string][] = [];
    for (const [role, perms] of Object.entries(rolePermissions)) {
      for (const perm of perms) links.push([role, perm]);
    }
    await client.query('DELETE FROM iam.role_permissions');
    for (const [role, perm] of links) {
      await client.query(
        'INSERT INTO iam.role_permissions (role_code, permission_code) VALUES ($1, $2)',
        [role, perm],
      );
    }

    await client.query('DELETE FROM iam.sod_conflicts');
    for (const [a, b] of sodConflicts) {
      await client.query('INSERT INTO iam.sod_conflicts (role_a, role_b) VALUES ($1, $2)', [a, b]);
    }
    // Configuration: the registry is the source of the items; their versions belong to the database.
    let bootstrapped = 0;
    for (const key of configKeys) {
      const item = configRegistry[key];
      await client.query(
        `INSERT INTO config.config_items (key, schema, safety_locked, description) VALUES ($1,$2,$3,$4)
         ON CONFLICT (key) DO UPDATE SET schema = EXCLUDED.schema, safety_locked = EXCLUDED.safety_locked,
           description = EXCLUDED.description`,
        [key, JSON.stringify(configJsonSchema(key)), item.safetyLocked, item.description],
      );
      const r = await client.query(
        `INSERT INTO config.config_versions
           (id, key, version, value, effective_from, status, reason, created_by, created_at)
         SELECT $1, $2, 1, $3, $4, 'active', 'default value', 'system:bootstrap', $4
          WHERE NOT EXISTS (SELECT 1 FROM config.config_versions WHERE key = $2)`,
        [bootstrapId(key), key, JSON.stringify(item.default), BOOTSTRAP_TIME],
      );
      bootstrapped += r.rowCount ?? 0;
    }
    await client.query('COMMIT');
    return {
      roles: roles.length,
      permissions: permissions.length,
      rolePermissions: links.length,
      sodConflicts: sodConflicts.length,
      configItems: configKeys.length,
      configBootstrapped: bootstrapped,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}
