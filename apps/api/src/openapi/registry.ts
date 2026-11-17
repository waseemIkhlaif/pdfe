import type { SchemaName } from './schemas';

/**
 * What the routes take and give, beyond what the controller metadata says (contracts/http-api.md). A route with no
 * entry fails `openapi.int.spec.ts`, so a new route cannot ship undocumented. `errors` lists the statuses a caller can
 * meet in addition to the ones every route has (401, 403 and 429 for protected routes, 400 for a missing
 * Idempotency-Key on changes).
 */
export interface RouteDoc {
  summary: string;
  tag: 'platform' | 'identity' | 'approvals' | 'tenancy' | 'audit' | 'config' | 'demo';
  request?: SchemaName;
  /** Query parameters. */
  query?: { name: string; description: string; required?: boolean }[];
  /** The body of the success response. Omit for an empty body. */
  response?: SchemaName;
  /** The body is a file, not JSON: the content types it can have, with what each holds. */
  file?: Record<string, string>;
  /** The route never succeeds: it records something and then fails with a 500 (the error page's demonstration). */
  fails?: true;
  /** Success status when it is not the default (201 for POST, 200 otherwise). */
  status?: number;
  /** Extra success statuses (`204` for "no active elevation"). */
  alsoStatus?: number[];
  errors?: number[];
}

export const REGISTRY: Record<string, RouteDoc> = {
  'GET /v1/health': {
    summary: 'Liveness and readiness. Reports the mode and the adapter types (all mock).',
    tag: 'platform',
    response: 'Health',
    alsoStatus: [503],
  },
  'GET /v1/meta': { summary: 'API version and build.', tag: 'platform', response: 'Meta' },
  'GET /v1/me': {
    summary:
      'The caller: user, tenant, roles, permissions, second-factor status and active elevation.',
    tag: 'identity',
    response: 'Me',
  },

  'GET /v1/approvals': {
    summary: 'Approval requests the caller made or can decide, newest first.',
    tag: 'approvals',
    query: [
      { name: 'status', description: 'pending, approved, rejected, cancelled or expired' },
      { name: 'action_type', description: 'For example iam.role.grant' },
      { name: 'cursor', description: 'The next_cursor of the previous page' },
      { name: 'limit', description: '1 to 100, default 50' },
    ],
    response: 'ApprovalList',
    errors: [404],
  },
  'GET /v1/approvals/:id': {
    summary: 'One approval request with its decisions.',
    tag: 'approvals',
    response: 'Approval',
    errors: [404],
  },
  'POST /v1/approvals/:id/decisions': {
    summary: 'Approve or reject. The approve permission depends on the request action type.',
    tag: 'approvals',
    request: 'ApprovalDecisionRequest',
    response: 'Approval',
    status: 200,
    errors: [404, 409, 422],
  },
  'POST /v1/approvals/:id/cancel': {
    summary: 'The requester cancels a pending request.',
    tag: 'approvals',
    request: 'ApprovalCancelRequest',
    response: 'Approval',
    status: 200,
    errors: [404, 409, 422],
  },

  'GET /v1/iam/users': {
    summary: 'Users of the caller tenant, or of all tenants for a platform administrator.',
    tag: 'identity',
    response: 'IamUserList',
  },
  'GET /v1/iam/roles': {
    summary: 'Roles with their permissions and separation-of-duties conflicts.',
    tag: 'identity',
    response: 'IamRoleList',
  },
  'POST /v1/iam/users/:id/role-grants': {
    summary:
      'Ask for a role grant. Creates an approval request; refused up front on a separation-of-duties conflict.',
    tag: 'identity',
    request: 'RoleChangeRequest',
    response: 'Approval',
    errors: [404, 409, 422],
  },
  'POST /v1/iam/users/:id/role-revocations': {
    summary: 'Ask for a role to be taken away. Creates an approval request.',
    tag: 'identity',
    request: 'RoleChangeRequest',
    response: 'Approval',
    errors: [404, 422],
  },

  'GET /v1/config': {
    summary:
      'Every setting with its active version. Safety-locked settings are marked `editable: false`.',
    tag: 'config',
    response: 'ConfigItemList',
  },
  'GET /v1/config/:key/versions': {
    summary: 'The version history of one setting, newest first.',
    tag: 'config',
    response: 'ConfigVersionList',
    errors: [404],
  },
  'GET /v1/config/:key/diff': {
    summary: 'The JSON Patch (RFC 6902) that turns one version of a setting into another.',
    tag: 'config',
    query: [
      { name: 'from', description: 'Version number', required: true },
      { name: 'to', description: 'Version number', required: true },
    ],
    response: 'ConfigDiff',
    errors: [404, 422],
  },
  'POST /v1/config/:key/versions': {
    summary:
      'Propose a new value, now or from a later time. Creates the approval request config.change; nothing changes until it is approved.',
    tag: 'config',
    request: 'ConfigProposalRequest',
    response: 'Approval',
    errors: [404, 409, 422],
  },
  'POST /v1/config/:key/rollback': {
    summary:
      'Propose going back to an earlier version. Creates the approval request config.rollback; the old value must still be valid.',
    tag: 'config',
    request: 'ConfigRollbackRequest',
    response: 'Approval',
    errors: [404, 409, 422],
  },

  'GET /v1/demo/scenarios': {
    summary: 'The registered scenarios: code, version, titles and the checksum of the manifest.',
    tag: 'demo',
    response: 'ScenarioList',
  },
  'POST /v1/demo/scenarios/:code/runs': {
    summary:
      'Reset the demo data and seed it from a scenario, deterministically for the seed. Returns the finished run: succeeded with its digest and report, or failed with an error code (the data is then in the reset state).',
    tag: 'demo',
    request: 'ScenarioRunRequest',
    response: 'ScenarioRun',
    errors: [404, 409, 422],
  },
  'GET /v1/demo/runs/:id': {
    summary: 'One scenario run: status, digest, and the report of what it created.',
    tag: 'demo',
    response: 'ScenarioRun',
    errors: [404],
  },

  'POST /v1/elevations': {
    summary: 'Start a read-only, time-limited, audited elevation into one other tenant.',
    tag: 'tenancy',
    request: 'StartElevationRequest',
    response: 'Elevation',
    errors: [409, 422],
  },
  'GET /v1/audit/events': {
    summary:
      'Search the audit trail by actor, action, tenant, time range or correlation ID. Newest first.',
    tag: 'audit',
    query: [
      { name: 'actor', description: 'User ID of the actor' },
      { name: 'action', description: 'For example iam.role.granted' },
      { name: 'tenant', description: 'Tenant ID' },
      { name: 'from', description: 'Earliest time, ISO 8601' },
      { name: 'to', description: 'Latest time, ISO 8601' },
      { name: 'correlation_id', description: 'Follow one action across components' },
      { name: 'cursor', description: 'The next_cursor of the previous page' },
      { name: 'limit', description: '1 to 100, default 50' },
    ],
    response: 'AuditEventList',
    errors: [422],
  },
  'POST /v1/audit/verify': {
    summary:
      'Check the hash chain and its anchors. Says ok, or names the first event that does not check out.',
    tag: 'audit',
    request: 'VerifyRequest',
    response: 'VerifyResult',
    status: 200,
    errors: [422],
  },
  'GET /v1/audit/export': {
    summary: 'Export the matching events as a labelled CSV or JSON file, streamed.',
    tag: 'audit',
    query: [
      { name: 'format', description: 'csv or json', required: true },
      { name: 'actor', description: 'User ID of the actor' },
      { name: 'action', description: 'For example iam.role.granted' },
      { name: 'tenant', description: 'Tenant ID' },
      { name: 'from', description: 'Earliest time, ISO 8601' },
      { name: 'to', description: 'Latest time, ISO 8601' },
      { name: 'correlation_id', description: 'Follow one action across components' },
    ],
    file: {
      'text/csv':
        'First line: the simulation label as a comment. Then a header row and one row per event.',
      'application/json':
        'An object with meta.label (the simulation label), meta.filters and the events array.',
    },
    errors: [422],
  },
  'POST /v1/demo/simulate-error': {
    summary:
      'DEMO only: records the audit event demo.error_simulated, then fails with the ordinary 500 error envelope.',
    tag: 'demo',
    fails: true,
    errors: [500],
  },
  'GET /v1/elevations/current': {
    summary: 'The caller active elevation, or 204 when there is none.',
    tag: 'tenancy',
    response: 'Elevation',
    alsoStatus: [204],
  },
  'POST /v1/elevations/:id/end': {
    summary: 'The owner ends an elevation.',
    tag: 'tenancy',
    status: 204,
    errors: [404, 409],
  },
};
