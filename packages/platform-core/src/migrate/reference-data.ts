import pg from 'pg';
import { permissions, rolePermissions, roles, sodConflicts } from '@pdfe/domain-types';

export interface ReferenceDataResult {
  roles: number;
  permissions: number;
  rolePermissions: number;
  sodConflicts: number;
}

/**
 * Upserts iam.roles, iam.permissions, iam.role_permissions and iam.sod_conflicts from rbac.ts.
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
    await client.query('COMMIT');
    return {
      roles: roles.length,
      permissions: permissions.length,
      rolePermissions: links.length,
      sodConflicts: sodConflicts.length,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}
