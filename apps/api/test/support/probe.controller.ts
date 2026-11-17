import { Body, Controller, Get, Post } from '@nestjs/common';
import { RequirePermission } from '../../src/identity/public.decorator';
import { CurrentTx } from '../../src/tenancy/tenant-context.interceptor';
import type { Tx } from '@pdfe/platform-core/db';

/** Test-only routes: a tenant-scoped read through the request transaction, and a counting write. */
@Controller('v1/probe')
export class ProbeController {
  static calls = 0;

  @Get('orgs')
  @RequirePermission('me.read')
  async orgs(@CurrentTx() tx: Tx) {
    const r = await tx.client.query<{ display_name: string }>(
      'SELECT display_name FROM platform.organizations ORDER BY display_name',
    );
    return { orgs: r.rows.map((x) => x.display_name) };
  }

  @Post()
  @RequirePermission('me.read')
  async write(@Body() body: { delay_ms?: number; fail?: boolean }) {
    ProbeController.calls += 1;
    const n = ProbeController.calls;
    if (body?.delay_ms) await new Promise((r) => setTimeout(r, body.delay_ms));
    if (body?.fail) throw new Error('probe failure');
    return { n };
  }
}
