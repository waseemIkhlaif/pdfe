import { describe, expect, it } from 'vitest';
import {
  actionTypes,
  approvePermissionFor,
  permissions,
  privilegedRoles,
  rolePermissions,
  roles,
  sodConflicts,
  tripleRuleGroups,
} from '../src/rbac';

// data-model.md §RBAC: permission -> roles that hold it.
const DATA_MODEL_HOLDERS: Record<string, string[] | 'every' | 'requesters-and-approvers'> = {
  'me.read': 'every',
  'iam.read': ['platform_admin', 'auditor'],
  'iam.role.grant.request': ['platform_admin'],
  'iam.role.grant.approve': ['platform_admin'],
  'approvals.read': 'requesters-and-approvers',
  'audit.read': ['auditor', 'compliance_analyst', 'compliance_approver'],
  'audit.export': ['auditor'],
  'audit.verify': ['auditor'],
  'config.read': ['platform_admin', 'ops_analyst', 'finance_analyst', 'auditor'],
  'config.request': ['platform_admin'],
  'config.approve': ['platform_admin'],
  'demo.scenario.run': ['platform_admin', 'ops_analyst'],
  'tenant.elevate': ['ops_analyst', 'platform_admin'],
  'audit.admin': [], // reserved: no Phase 2 holder
};

const holdersOf = (perm: string) =>
  roles.filter((r) => rolePermissions[r.name].includes(perm)).map((r) => r.name);

describe('rbac matrix', () => {
  it('has the 15 roles of the spec', () => {
    expect(roles.map((r) => r.name).sort()).toEqual(
      [
        'individual',
        'merchant_owner',
        'merchant_cashier',
        'biz_preparer',
        'biz_approver',
        'ops_analyst',
        'compliance_analyst',
        'compliance_approver',
        'finance_analyst',
        'finance_approver',
        'issuer_operator',
        'stb_approver',
        'platform_admin',
        'auditor',
        'demo_viewer',
      ].sort(),
    );
  });

  it('every permission of data-model §RBAC exists and has its holders', () => {
    const names = new Set(permissions.map((p) => p.name));
    for (const [perm, expected] of Object.entries(DATA_MODEL_HOLDERS)) {
      expect(names.has(perm), `permission ${perm}`).toBe(true);
      const actual = holdersOf(perm).sort();
      if (expected === 'every') {
        expect(actual, perm).toEqual(roles.map((r) => r.name).sort());
      } else if (expected === 'requesters-and-approvers') {
        const needing = roles
          .filter((r) => rolePermissions[r.name].some((p) => /\.(request|approve)$/.test(p)))
          .map((r) => r.name);
        for (const r of needing) expect(actual, `${perm} for ${r}`).toContain(r);
      } else {
        expect(actual, perm).toEqual([...expected].sort());
      }
    }
  });

  it('marks the high-risk permissions of data-model §RBAC', () => {
    const high = new Set(permissions.filter((p) => p.highRisk).map((p) => p.name));
    for (const p of [
      'iam.role.grant.request',
      'iam.role.grant.approve',
      'audit.export',
      'config.request',
      'config.approve',
      'demo.scenario.run',
      'tenant.elevate',
      'audit.admin',
    ]) {
      expect(high.has(p), p).toBe(true);
    }
    for (const p of [
      'me.read',
      'iam.read',
      'approvals.read',
      'audit.read',
      'audit.verify',
      'config.read',
    ]) {
      expect(high.has(p), p).toBe(false);
    }
  });

  it('only grants permissions that exist', () => {
    const names = new Set(permissions.map((p) => p.name));
    for (const [role, perms] of Object.entries(rolePermissions)) {
      for (const p of perms) expect(names.has(p), `${role} -> ${p}`).toBe(true);
    }
  });

  it('the privileged set is exactly the 9 console roles', () => {
    expect([...privilegedRoles].sort()).toEqual(
      [
        'ops_analyst',
        'compliance_analyst',
        'compliance_approver',
        'finance_analyst',
        'finance_approver',
        'issuer_operator',
        'stb_approver',
        'platform_admin',
        'auditor',
      ].sort(),
    );
    expect(
      roles
        .filter((r) => r.privileged)
        .map((r) => r.name)
        .sort(),
    ).toEqual([...privilegedRoles].sort());
  });

  it('every SoD pair is stored in both orders', () => {
    const has = (a: string, b: string) => sodConflicts.some(([x, y]) => x === a && y === b);
    expect(sodConflicts.length).toBeGreaterThan(0);
    for (const [a, b] of sodConflicts) {
      expect(a).not.toBe(b);
      expect(has(b, a), `${b}-${a}`).toBe(true);
    }
  });

  it('contains the seeded conflicts of data-model §RBAC', () => {
    const has = (a: string, b: string) => sodConflicts.some(([x, y]) => x === a && y === b);
    const pairs: [string, string][] = [
      ['biz_preparer', 'biz_approver'],
      ['compliance_analyst', 'compliance_approver'],
      ['finance_analyst', 'finance_approver'],
      ['issuer_operator', 'stb_approver'],
      ['ops_analyst', 'finance_approver'],
      ['platform_admin', 'biz_approver'],
      ['platform_admin', 'compliance_approver'],
      ['platform_admin', 'finance_approver'],
      ['platform_admin', 'stb_approver'],
    ];
    for (const [a, b] of pairs) expect(has(a, b), `${a}-${b}`).toBe(true);
  });

  it('auditor conflicts with every role holding a write permission', () => {
    const writePerms = new Set(permissions.filter((p) => p.write).map((p) => p.name));
    const writers = roles
      .filter((r) => r.name !== 'auditor' && rolePermissions[r.name].some((p) => writePerms.has(p)))
      .map((r) => r.name);
    expect(writers.length).toBeGreaterThan(0);
    for (const w of writers) {
      expect(
        sodConflicts.some(([a, b]) => a === 'auditor' && b === w),
        `auditor-${w}`,
      ).toBe(true);
    }
    // The auditor itself holds no write permission.
    expect(rolePermissions.auditor.some((p) => writePerms.has(p))).toBe(false);
    // Read-only roles do not conflict.
    expect(sodConflicts.some(([a, b]) => a === 'auditor' && b === 'demo_viewer')).toBe(false);
  });

  it('no single role spans the three triple-rule groups', () => {
    expect(tripleRuleGroups).toHaveLength(3);
    for (const r of roles) {
      const hit = tripleRuleGroups.filter((g) =>
        g.some((p) => rolePermissions[r.name].includes(p)),
      );
      expect(hit.length, r.name).toBeLessThan(3);
    }
  });

  it('every action_type has an approve permission that exists', () => {
    const names = new Set(permissions.map((p) => p.name));
    expect(actionTypes.length).toBeGreaterThan(0);
    for (const a of actionTypes) {
      const p = approvePermissionFor[a];
      expect(p, a).toBeTruthy();
      expect(names.has(p as string), `${a} -> ${p}`).toBe(true);
    }
    expect(approvePermissionFor['iam.role.grant']).toBe('iam.role.grant.approve');
    expect(approvePermissionFor['iam.role.revoke']).toBe('iam.role.grant.approve');
    expect(approvePermissionFor['config.change']).toBe('config.approve');
    expect(approvePermissionFor['config.rollback']).toBe('config.approve');
  });
});
