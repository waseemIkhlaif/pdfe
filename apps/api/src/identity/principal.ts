import type { Tx } from '@pdfe/platform-core/db';

export interface ActiveElevation {
  id: string;
  targetTenantId: string;
  reason: string;
  startedAt: string;
  expiresAt: string;
}

/** Who is calling: built from the verified token and the database, never from request input. */
export interface Principal {
  userId: string;
  subject: string;
  displayName: string;
  locale: string;
  /** Home tenant, from the token claim `tenant_id`. */
  tenantId: string;
  roles: string[];
  permissions: ReadonlySet<string>;
  /** The token shows a second factor (`otp` in `amr`). */
  mfa: boolean;
  sessionId?: string;
  elevation?: ActiveElevation;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      principal?: Principal;
      /** The request transaction opened by TenantContextInterceptor. */
      tx?: Tx;
    }
  }
}
