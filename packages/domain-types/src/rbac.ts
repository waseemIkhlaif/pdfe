/**
 * Roles, permissions and separation-of-duties rules (plan §J.3, data-model.md §RBAC, research R-6).
 * This file is the single source: the migration CLI seeds iam.* from it, the guards read it,
 * and the negative authorization suite is generated from it.
 */

export type RoleName =
  | 'individual'
  | 'merchant_owner'
  | 'merchant_cashier'
  | 'biz_preparer'
  | 'biz_approver'
  | 'ops_analyst'
  | 'compliance_analyst'
  | 'compliance_approver'
  | 'finance_analyst'
  | 'finance_approver'
  | 'issuer_operator'
  | 'stb_approver'
  | 'platform_admin'
  | 'auditor'
  | 'demo_viewer';

export interface RoleDef {
  name: RoleName;
  /** Privileged roles need a second factor (`otp` in the token `amr`). */
  privileged: boolean;
}

export interface PermissionDef {
  name: string;
  /** High-risk permissions are the ones that need maker-checker or are audited more closely. */
  highRisk: boolean;
  /** A write permission changes state. Used for the auditor separation-of-duties rule. */
  write: boolean;
}

export const roles: readonly RoleDef[] = [
  { name: 'individual', privileged: false },
  { name: 'merchant_owner', privileged: false },
  { name: 'merchant_cashier', privileged: false },
  { name: 'biz_preparer', privileged: false },
  { name: 'biz_approver', privileged: false },
  { name: 'ops_analyst', privileged: true },
  { name: 'compliance_analyst', privileged: true },
  { name: 'compliance_approver', privileged: true },
  { name: 'finance_analyst', privileged: true },
  { name: 'finance_approver', privileged: true },
  { name: 'issuer_operator', privileged: true },
  { name: 'stb_approver', privileged: true },
  { name: 'platform_admin', privileged: true },
  { name: 'auditor', privileged: true },
  { name: 'demo_viewer', privileged: false },
];

export const privilegedRoles: readonly RoleName[] = roles
  .filter((r) => r.privileged)
  .map((r) => r.name);

const p = (name: string, write: boolean, highRisk = false): PermissionDef => ({
  name,
  write,
  highRisk,
});

export const permissions: readonly PermissionDef[] = [
  // every role
  p('me.read', false),
  p('approvals.read', false),
  // consumer and merchant (plan §J.3)
  p('wallet.read', false),
  p('wallet.send', true),
  p('remit.create', true),
  p('exc.trade', true),
  p('psh.convert', true),
  p('pay.intent.create', true),
  p('pay.refund', true),
  p('merchant.staff.manage', true),
  // business
  p('biz.invoice.manage', true),
  p('biz.payout.request', true, true),
  p('biz.payout.approve', true, true),
  // operations
  p('ops.read', false),
  p('ops.retry', true),
  p('ops.cancel', true),
  p('ops.reversal.request', true, true),
  // compliance
  p('cmp.review', false),
  p('cmp.case.manage', true),
  p('cmp.disposition.request', true, true),
  p('cmp.disposition.approve', true, true),
  // finance
  p('finance.read', false),
  p('ledger.fund.request', true, true),
  p('recon.resolve.request', true, true),
  p('ledger.fund.approve', true, true),
  p('recon.adjust.approve', true, true),
  p('ledger.reverse.approve', true, true),
  // stable-value
  p('stb.issuance.request', true, true),
  p('stb.burn.process', true, true),
  p('stb.issuance.approve', true, true),
  // triple-rule group 1 (reserved: no Phase 2 holder)
  p('ledger.post', true, true),
  p('ledger.adjust', true, true),
  // identity, config, audit, demo, tenancy (data-model.md §RBAC)
  p('iam.read', false),
  p('iam.role.grant.request', true, true),
  p('iam.role.grant.approve', true, true),
  p('audit.read', false),
  p('audit.export', false, true),
  p('audit.verify', false),
  p('audit.admin', true, true), // reserved: no Phase 2 holder; part of the triple rule
  p('config.read', false),
  p('config.request', true, true),
  p('config.approve', true, true),
  p('demo.scenario.run', true, true),
  p('tenant.elevate', true, true),
  p('investor.read', false),
];

export const rolePermissions: Readonly<Record<RoleName, readonly string[]>> = {
  individual: ['me.read', 'wallet.read', 'wallet.send', 'remit.create', 'exc.trade', 'psh.convert'],
  merchant_owner: ['me.read', 'pay.intent.create', 'pay.refund', 'merchant.staff.manage'],
  merchant_cashier: ['me.read', 'pay.intent.create'],
  biz_preparer: ['me.read', 'approvals.read', 'biz.invoice.manage', 'biz.payout.request'],
  biz_approver: ['me.read', 'approvals.read', 'biz.payout.approve'],
  ops_analyst: [
    'me.read',
    'approvals.read',
    'ops.read',
    'ops.retry',
    'ops.cancel',
    'ops.reversal.request',
    'config.read',
    'demo.scenario.run',
    'tenant.elevate',
  ],
  compliance_analyst: [
    'me.read',
    'approvals.read',
    'cmp.review',
    'cmp.case.manage',
    'cmp.disposition.request',
    'audit.read',
  ],
  compliance_approver: ['me.read', 'approvals.read', 'cmp.disposition.approve', 'audit.read'],
  finance_analyst: [
    'me.read',
    'approvals.read',
    'finance.read',
    'ledger.fund.request',
    'recon.resolve.request',
    'config.read',
  ],
  finance_approver: [
    'me.read',
    'approvals.read',
    'ledger.fund.approve',
    'recon.adjust.approve',
    'ledger.reverse.approve',
  ],
  issuer_operator: ['me.read', 'approvals.read', 'stb.issuance.request', 'stb.burn.process'],
  stb_approver: ['me.read', 'approvals.read', 'stb.issuance.approve'],
  platform_admin: [
    'me.read',
    'approvals.read',
    'iam.read',
    'iam.role.grant.request',
    'iam.role.grant.approve',
    'config.read',
    'config.request',
    'config.approve',
    'demo.scenario.run',
    'tenant.elevate',
  ],
  auditor: ['me.read', 'iam.read', 'audit.read', 'audit.export', 'audit.verify', 'config.read'],
  demo_viewer: ['me.read', 'investor.read'],
};

const writePermissionNames = new Set(permissions.filter((x) => x.write).map((x) => x.name));

const explicitConflicts: [RoleName, RoleName][] = [
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

// The auditor conflicts with every role that holds a write permission.
for (const r of roles) {
  if (r.name === 'auditor') continue;
  if (rolePermissions[r.name].some((x) => writePermissionNames.has(x))) {
    explicitConflicts.push(['auditor', r.name]);
  }
}

/** Conflicting role pairs, stored in both orders. */
export const sodConflicts: readonly (readonly [RoleName, RoleName])[] = (() => {
  const seen = new Set<string>();
  const out: [RoleName, RoleName][] = [];
  for (const [a, b] of explicitConflicts) {
    for (const pair of [
      [a, b],
      [b, a],
    ] as [RoleName, RoleName][]) {
      const key = `${pair[0]}|${pair[1]}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(pair);
      }
    }
  }
  return out;
})();

/** Triple rule (R-6): no user may hold permissions from all three groups. */
export const tripleRuleGroups: readonly (readonly string[])[] = [
  ['ledger.post', 'ledger.adjust'],
  ['stb.issuance.approve'],
  ['audit.admin'],
];

/** Approval action types and the permission needed to approve each. */
export const approvePermissionFor: Readonly<Record<string, string>> = {
  'iam.role.grant': 'iam.role.grant.approve',
  'iam.role.revoke': 'iam.role.grant.approve',
  'config.change': 'config.approve',
  'config.rollback': 'config.approve',
};

export const actionTypes: readonly string[] = Object.keys(approvePermissionFor);

export function isPrivileged(role: string): boolean {
  return (privilegedRoles as readonly string[]).includes(role);
}

/** Permissions held by a set of roles. */
export function permissionsOf(roleNames: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const r of roleNames) {
    for (const perm of rolePermissions[r as RoleName] ?? []) out.add(perm);
  }
  return out;
}

/** Roles in a set that conflict with `candidate`, and whether the triple rule would be broken. */
export function sodViolations(
  held: readonly string[],
  candidate: string,
): { conflicts: string[]; triple: boolean } {
  const conflicts = held.filter((h) => sodConflicts.some(([a, b]) => a === candidate && b === h));
  const perms = permissionsOf([...held, candidate]);
  const triple = tripleRuleGroups.every((g) => g.some((x) => perms.has(x)));
  return { conflicts, triple };
}
