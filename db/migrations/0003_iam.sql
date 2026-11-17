-- 0003_iam: users, roles, permissions, separation of duties, maker-checker, tenant elevation.
-- Reference tables (roles, permissions, role_permissions, sod_conflicts) are seeded from
-- packages/domain-types/src/rbac.ts by the migration CLI after the migrations (reference-data.ts).
-- Timestamps carry no DEFAULT now(): every time value comes from the injected ClockService (R-13).

CREATE TABLE iam.users (
  id               uuid PRIMARY KEY,
  tenant_id        uuid NOT NULL REFERENCES platform.tenants (id),
  external_subject text NOT NULL UNIQUE,
  display_name     text NOT NULL,
  locale           text NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar', 'en')),
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  is_synthetic     boolean NOT NULL DEFAULT true CHECK (is_synthetic),
  created_at       timestamptz NOT NULL,
  version          integer NOT NULL DEFAULT 1
);
CREATE INDEX users_tenant_idx ON iam.users (tenant_id);

CREATE TABLE iam.roles (
  code        text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  privileged  boolean NOT NULL DEFAULT false
);

CREATE TABLE iam.permissions (
  code        text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  high_risk   boolean NOT NULL DEFAULT false
);

CREATE TABLE iam.role_permissions (
  role_code       text NOT NULL REFERENCES iam.roles (code),
  permission_code text NOT NULL REFERENCES iam.permissions (code),
  PRIMARY KEY (role_code, permission_code)
);

-- Stored symmetric: both orders are inserted.
CREATE TABLE iam.sod_conflicts (
  role_a text NOT NULL REFERENCES iam.roles (code),
  role_b text NOT NULL REFERENCES iam.roles (code),
  reason text NOT NULL DEFAULT '',
  PRIMARY KEY (role_a, role_b),
  CHECK (role_a <> role_b)
);

CREATE TABLE iam.approval_requests (
  id                 uuid PRIMARY KEY,
  tenant_id          uuid NOT NULL REFERENCES platform.tenants (id),
  action_type        text NOT NULL,
  target_type        text NOT NULL,
  target_id          text,
  payload            jsonb NOT NULL,
  payload_hash       text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  requested_by       uuid NOT NULL REFERENCES iam.users (id),
  reason             text NOT NULL,
  required_approvals integer NOT NULL DEFAULT 1 CHECK (required_approvals >= 1),
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  expires_at         timestamptz NOT NULL,
  created_at         timestamptz NOT NULL,
  correlation_id     text NOT NULL,
  version            integer NOT NULL DEFAULT 1
);
CREATE INDEX approval_requests_tenant_status_idx ON iam.approval_requests (tenant_id, status);
CREATE INDEX approval_requests_pending_expiry_idx ON iam.approval_requests (expires_at) WHERE status = 'pending';

CREATE TABLE iam.approval_decisions (
  id                  uuid PRIMARY KEY,
  approval_request_id uuid NOT NULL REFERENCES iam.approval_requests (id),
  decided_by          uuid NOT NULL REFERENCES iam.users (id),
  decision            text NOT NULL CHECK (decision IN ('approve', 'reject')),
  reason              text NOT NULL DEFAULT '',
  decided_at          timestamptz NOT NULL,
  UNIQUE (approval_request_id, decided_by)
);

CREATE TABLE iam.user_roles (
  user_id             uuid NOT NULL REFERENCES iam.users (id),
  role_code           text NOT NULL REFERENCES iam.roles (code),
  organization_id     uuid REFERENCES platform.organizations (id),
  granted_by          uuid REFERENCES iam.users (id),
  granted_at          timestamptz NOT NULL,
  approval_request_id uuid REFERENCES iam.approval_requests (id),
  -- organization_id may be NULL (a tenant-wide role), so the key treats NULLs as equal.
  UNIQUE NULLS NOT DISTINCT (user_id, role_code, organization_id)
);
CREATE INDEX user_roles_user_idx ON iam.user_roles (user_id);

CREATE TABLE iam.tenant_elevations (
  id               uuid PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES iam.users (id),
  home_tenant_id   uuid NOT NULL REFERENCES platform.tenants (id),
  target_tenant_id uuid NOT NULL REFERENCES platform.tenants (id),
  reason           text NOT NULL CHECK (char_length(reason) >= 10),
  started_at       timestamptz NOT NULL,
  expires_at       timestamptz NOT NULL,
  ended_at         timestamptz,
  end_reason       text CHECK (end_reason IN ('user', 'expired', 'revoked')),
  correlation_id   text NOT NULL,
  CHECK (expires_at > started_at),
  CHECK ((ended_at IS NULL) = (end_reason IS NULL))
);
-- At most one active elevation per user.
CREATE UNIQUE INDEX tenant_elevations_one_active_idx ON iam.tenant_elevations (user_id) WHERE ended_at IS NULL;

-- FR-016: nobody approves their own request. The service checks first; this trigger is the backstop.
CREATE FUNCTION iam.no_self_approval() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  requester uuid;
BEGIN
  SELECT requested_by INTO requester FROM iam.approval_requests WHERE id = NEW.approval_request_id;
  IF requester IS NULL THEN
    RAISE EXCEPTION 'SELF_APPROVAL: approval request % not found for decision', NEW.approval_request_id
      USING ERRCODE = 'P0001';
  END IF;
  IF requester = NEW.decided_by THEN
    RAISE EXCEPTION 'SELF_APPROVAL: user % cannot decide their own request %', NEW.decided_by, NEW.approval_request_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_no_self_approval
  BEFORE INSERT ON iam.approval_decisions
  FOR EACH ROW EXECUTE FUNCTION iam.no_self_approval();

-- R-6: a grant is refused when it creates a separation-of-duties conflict or the triple-rule violation.
-- The three triple-rule groups mirror `tripleRuleGroups` in packages/domain-types/src/rbac.ts.
CREATE FUNCTION iam.user_roles_sod() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  clash text;
  has_ledger boolean;
  has_issuance boolean;
  has_audit_admin boolean;
BEGIN
  SELECT string_agg(DISTINCT ur.role_code, ', ' ORDER BY ur.role_code) INTO clash
    FROM iam.user_roles ur
    JOIN iam.sod_conflicts c ON c.role_a = NEW.role_code AND c.role_b = ur.role_code
   WHERE ur.user_id = NEW.user_id;
  IF clash IS NOT NULL THEN
    RAISE EXCEPTION 'SOD_CONFLICT: role % conflicts with held role(s) %', NEW.role_code, clash
      USING ERRCODE = 'P0001';
  END IF;

  SELECT
    bool_or(rp.permission_code IN ('ledger.post', 'ledger.adjust')),
    bool_or(rp.permission_code = 'stb.issuance.approve'),
    bool_or(rp.permission_code = 'audit.admin')
    INTO has_ledger, has_issuance, has_audit_admin
    FROM iam.role_permissions rp
   WHERE rp.role_code = NEW.role_code
      OR rp.role_code IN (SELECT role_code FROM iam.user_roles WHERE user_id = NEW.user_id);
  IF coalesce(has_ledger, false) AND coalesce(has_issuance, false) AND coalesce(has_audit_admin, false) THEN
    RAISE EXCEPTION 'SOD_CONFLICT: role % would give user % the three permission groups of the triple rule', NEW.role_code, NEW.user_id
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_user_roles_sod
  BEFORE INSERT ON iam.user_roles
  FOR EACH ROW EXECUTE FUNCTION iam.user_roles_sod();

-- The platform administrator's user directory spans tenants. iam.users has FORCE ROW LEVEL SECURITY and
-- there is no bypass flag, so the function visits each tenant in turn and restores the caller's setting.
-- It returns non-PII directory columns only, and only app_role may run it. The service calls it only for
-- platform_admin.
CREATE FUNCTION iam.list_users_all()
RETURNS TABLE (id uuid, tenant_id uuid, display_name text, locale text, status text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, iam, platform AS $$
DECLARE
  saved text := current_setting('app.tenant_id', true);
  t uuid;
BEGIN
  FOR t IN SELECT tn.id FROM platform.tenants tn ORDER BY tn.code LOOP
    PERFORM set_config('app.tenant_id', t::text, true);
    RETURN QUERY
      SELECT u.id, u.tenant_id, u.display_name, u.locale, u.status, u.created_at
        FROM iam.users u ORDER BY u.display_name, u.id;
  END LOOP;
  PERFORM set_config('app.tenant_id', coalesce(saved, ''), true);
END $$;

REVOKE ALL ON FUNCTION iam.list_users_all() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION iam.list_users_all() TO app_role;
