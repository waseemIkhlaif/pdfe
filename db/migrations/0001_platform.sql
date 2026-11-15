-- 0001_platform: schemas, extension, tenants, legal entities, organizations.
-- Timestamps carry no DEFAULT now(): every time value comes from the injected ClockService (determinism, R-13).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS platform;
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS config;
CREATE SCHEMA IF NOT EXISTS demo;
CREATE SCHEMA IF NOT EXISTS integration;

GRANT USAGE ON SCHEMA platform, iam, audit, config, demo, integration TO app_role, readonly_role;

CREATE TABLE platform.tenants (
  id         uuid PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  kind       text NOT NULL CHECK (kind IN ('platform', 'consumer_pool', 'merchant', 'business', 'issuer', 'partner')),
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL,
  version    integer NOT NULL DEFAULT 1
);

CREATE TABLE platform.legal_entities (
  id           uuid PRIMARY KEY,
  tenant_id    uuid NOT NULL REFERENCES platform.tenants (id),
  code         text NOT NULL,
  name         text NOT NULL,
  is_synthetic boolean NOT NULL DEFAULT true CHECK (is_synthetic),
  created_at   timestamptz NOT NULL,
  UNIQUE (tenant_id, code)
);

CREATE TABLE platform.organizations (
  id              uuid PRIMARY KEY,
  tenant_id       uuid NOT NULL REFERENCES platform.tenants (id),
  legal_entity_id uuid REFERENCES platform.legal_entities (id),
  type            text NOT NULL CHECK (type IN ('merchant', 'business', 'issuer', 'partner_bank', 'platform')),
  display_name    text NOT NULL,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at      timestamptz NOT NULL,
  version         integer NOT NULL DEFAULT 1
);
CREATE INDEX organizations_tenant_idx ON platform.organizations (tenant_id);

GRANT SELECT, INSERT, UPDATE ON platform.tenants, platform.legal_entities, platform.organizations TO app_role;
GRANT SELECT ON platform.tenants, platform.legal_entities, platform.organizations, platform.schema_migrations
  TO readonly_role;
GRANT SELECT ON platform.schema_migrations TO app_role;
