/**
 * The expected authorization of every route (T089). A route with no entry fails the suite, so a new route cannot
 * ship without saying who may call it. Later stories add their routes here in the task that adds the route.
 *
 *  - public:        no token needed.
 *  - permission:    the caller's role must hold `permission`.
 *  - authenticated: any signed-in caller reaches the service, which decides. `foreign` is the status a record of
 *                   another tenant gets (row-level security hides it, so it does not exist for the caller).
 *
 * `own` is a request that passes authorization without changing anything (validation or a missing record
 * stops it); `other` is the same request aimed at a record of the other tenant.
 */
export type Entry =
  | { kind: 'public' }
  | { kind: 'permission'; permission: string; foreign?: number }
  | { kind: 'authenticated'; foreign: number };

export const MATRIX: Record<string, Entry> = {
  'GET /v1/health': { kind: 'public' },
  'GET /v1/meta': { kind: 'public' },
  'GET /v1/me': { kind: 'permission', permission: 'me.read' },

  'GET /v1/approvals': { kind: 'permission', permission: 'approvals.read' },
  'GET /v1/approvals/:id': { kind: 'permission', permission: 'approvals.read', foreign: 404 },
  'POST /v1/approvals/:id/decisions': { kind: 'authenticated', foreign: 404 },
  'POST /v1/approvals/:id/cancel': { kind: 'authenticated', foreign: 404 },

  'GET /v1/iam/users': { kind: 'permission', permission: 'iam.read' },
  'GET /v1/iam/roles': { kind: 'permission', permission: 'iam.read' },
  'POST /v1/iam/users/:id/role-grants': {
    kind: 'permission',
    permission: 'iam.role.grant.request',
    foreign: 404,
  },
  'POST /v1/iam/users/:id/role-revocations': {
    kind: 'permission',
    permission: 'iam.role.grant.request',
    foreign: 404,
  },

  'POST /v1/demo/simulate-error': { kind: 'permission', permission: 'me.read' },

  'GET /v1/audit/events': { kind: 'permission', permission: 'audit.read' },
  'POST /v1/audit/verify': { kind: 'permission', permission: 'audit.verify' },
  'GET /v1/audit/export': { kind: 'permission', permission: 'audit.export' },

  'POST /v1/elevations': { kind: 'permission', permission: 'tenant.elevate' },
  'GET /v1/elevations/current': { kind: 'permission', permission: 'tenant.elevate' },
  'POST /v1/elevations/:id/end': { kind: 'authenticated', foreign: 404 },
};
