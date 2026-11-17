-- 0006_rls_grants: row level security on every tenant-owned table, and the table grants.
-- There is no bypass flag. A missing or empty app.tenant_id matches no row.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'platform.legal_entities',
    'platform.organizations',
    'iam.users',
    'iam.approval_requests',
    'integration.idempotency_keys'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      $p$CREATE POLICY tenant_isolation ON %s
           USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
           WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)$p$,
      t);
  END LOOP;
END $$;

-- app_role: what the API and worker use.
GRANT SELECT ON iam.roles, iam.permissions, iam.role_permissions, iam.sod_conflicts TO app_role;
GRANT SELECT, INSERT, UPDATE ON iam.users, iam.approval_requests, iam.tenant_elevations TO app_role;
GRANT SELECT, INSERT, DELETE ON iam.user_roles TO app_role;
GRANT SELECT, INSERT ON iam.approval_decisions TO app_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON integration.idempotency_keys TO app_role;
GRANT SELECT, INSERT, UPDATE ON integration.outbox TO app_role;
GRANT SELECT, INSERT ON integration.inbox TO app_role;

-- readonly_role: reporting. Row level security still applies.
GRANT SELECT ON
  iam.users, iam.roles, iam.permissions, iam.role_permissions, iam.user_roles, iam.sod_conflicts,
  iam.approval_requests, iam.approval_decisions, iam.tenant_elevations,
  integration.idempotency_keys, integration.outbox, integration.inbox
  TO readonly_role;

-- demo_reset_role: used only by the scenario engine, through SET LOCAL ROLE. It may truncate the
-- demo-resettable tables and nothing else. Audit is never truncated.
GRANT USAGE ON SCHEMA platform, iam, integration TO demo_reset_role;
GRANT TRUNCATE ON
  integration.outbox, integration.idempotency_keys,
  iam.tenant_elevations, iam.approval_decisions, iam.approval_requests, iam.user_roles, iam.users,
  platform.organizations, platform.legal_entities, platform.tenants
  TO demo_reset_role;
-- app_role is made a member of demo_reset_role by the role setup (infra/postgres/init/01-roles.sh, and the
-- test-kit helper): granting a role needs more than the ownership the migrator has.
