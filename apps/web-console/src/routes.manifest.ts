/**
 * Every route of this app, for the checks that crawl it (contracts/ui-shell.md, "Route manifest").
 * `roles`: a demo role that can reach the route (`anonymous` needs no sign-in). `states`: the page states it can show
 * (`?state=` in DEMO). `baseline`: the design screen ID for the visual comparison; a route without one is listed by CI.
 * `roleBaselines`: more baselines for the same route, one per role (`role:SCREEN`). `example`: a concrete path to visit when
 * the route has a parameter; `dynamic` marks a route whose parameter is an ID created at run time (the shell checks reach it
 * through the flow that creates it). `scripts/ci/check-route-manifests.mjs` fails when a page exists on disk without an
 * entry here, or an entry has no page.
 */
export const routes = [
  {
    path: '/',
    roles: ['ops_analyst'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'OPS-001',
    roleBaselines: ['compliance_analyst:CMP-001', 'finance_analyst:FIN-001'],
  },
  {
    path: '/settings/language',
    roles: ['ops_analyst'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
  },
  { path: '/sign-in', roles: ['anonymous'], states: ['populated'] },
  { path: '/403', roles: ['anonymous'], states: ['denied'] },
  { path: '/error', roles: ['anonymous'], states: ['error'] },
  {
    path: '/admin/users',
    roles: ['platform_admin'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'ADM-001',
  },
  {
    path: '/admin/roles',
    roles: ['platform_admin'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'ADM-002',
  },
  {
    path: '/admin/tenants',
    roles: ['platform_admin'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'ADM-008',
  },
  {
    path: '/admin/config',
    roles: ['platform_admin'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'ADM-003',
  },
  {
    path: '/admin/config/[key]',
    roles: ['platform_admin'],
    states: ['populated', 'loading', 'error', 'denied'],
    baseline: 'ADM-004',
    example: '/admin/config/fees.default_minor',
  },
  {
    path: '/approvals',
    roles: ['platform_admin'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
  },
  {
    path: '/approvals/[id]',
    roles: ['platform_admin'],
    states: ['populated', 'loading', 'error', 'denied'],
    dynamic: 'approval',
  },
  {
    path: '/admin/scenarios',
    roles: ['platform_admin'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'OPS-002',
  },
  {
    path: '/admin/scenarios/runs/[id]',
    roles: ['platform_admin'],
    states: ['populated', 'loading', 'error', 'denied'],
    dynamic: 'run',
  },
  {
    path: '/audit',
    roles: ['auditor'],
    states: ['populated', 'empty', 'loading', 'error', 'denied'],
    baseline: 'CMP-011',
  },
  {
    path: '/audit/verify',
    roles: ['auditor'],
    states: ['populated', 'loading', 'error', 'denied'],
    baseline: 'CMP-012',
  },
  {
    path: '/audit/export',
    roles: ['auditor'],
    states: ['populated', 'loading', 'error', 'denied'],
    baseline: 'CMP-013',
  },
  {
    path: '/elevation',
    roles: ['ops_analyst'],
    states: ['populated', 'loading', 'error', 'denied'],
  },
] as const;
