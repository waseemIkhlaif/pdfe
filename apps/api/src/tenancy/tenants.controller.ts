import { Controller, Get } from '@nestjs/common';
import type { Tx } from '@pdfe/platform-core/db';
import { RequirePermission } from '../identity/public.decorator';
import { CurrentTx } from './tenant-context.interceptor';

/**
 * The tenants of the platform, read only (ADM-008). Tenants are platform-scoped records (no row-level security), so the
 * list is the same for everyone who may read the directory (`iam.read`); it holds no personal data.
 */
@Controller('v1/tenants')
export class TenantsController {
  @Get()
  @RequirePermission('iam.read')
  async list(@CurrentTx() tx: Tx) {
    const r = await tx.client.query<{
      id: string;
      code: string;
      name: string;
      kind: string;
      status: string;
      created_at: Date;
    }>('SELECT id, code, name, kind, status, created_at FROM platform.tenants ORDER BY code');
    return {
      items: r.rows.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        kind: t.kind,
        status: t.status,
        created_at: t.created_at.toISOString(),
      })),
    };
  }
}
