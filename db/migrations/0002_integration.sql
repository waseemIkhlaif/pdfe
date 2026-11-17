-- 0002_integration: registered adapters. Only mock adapter types can exist (constitution Article I).

CREATE TABLE integration.partner_adapters (
  code         text PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('bank', 'psp', 'chain', 'kyc', 'sanctions', 'fx', 'price', 'notification')),
  adapter_type text NOT NULL CHECK (adapter_type LIKE 'mock:%'),
  enabled      boolean NOT NULL DEFAULT true,
  UNIQUE (kind)
);

GRANT SELECT, INSERT, UPDATE ON integration.partner_adapters TO app_role;
GRANT SELECT ON integration.partner_adapters TO readonly_role;
