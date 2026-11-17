/** Every error code the API can return (contracts/http-api.md). The client turns the code into the key errors.<code_lower>. */
export const ERROR_CODES = {
  // general
  FORBIDDEN: 403,
  UNAUTHENTICATED: 401,
  MFA_REQUIRED: 401,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  // idempotency
  IDEMPOTENCY_KEY_REQUIRED: 400,
  IDEMPOTENCY_KEY_REUSED: 422,
  IDEMPOTENCY_IN_PROGRESS: 409,
  // approvals and identity
  SELF_APPROVAL: 409,
  NOT_PENDING: 409,
  EXPIRED: 409,
  PAYLOAD_CHANGED: 409,
  SOD_CONFLICT: 409,
  ELEVATION_ACTIVE: 409,
  ELEVATION_READ_ONLY: 409,
  // configuration
  CONFIG_INVALID: 422,
  CONFIG_SAFETY_LOCKED: 409,
  CONFIG_STALE: 409,
  // scenarios
  MANIFEST_CHECKSUM_MISMATCH: 409,
  RUN_IN_PROGRESS: 409,
  // adapters
  LIVE_ADAPTER_DISABLED: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
