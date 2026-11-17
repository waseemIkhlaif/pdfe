import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '@pdfe/platform-core';
import type { Tx } from '@pdfe/platform-core/db';
import { AuthenticatedOnly, RequirePermission } from '../identity/public.decorator';
import { CurrentTx } from '../tenancy/tenant-context.interceptor';
import { ApprovalsService } from './approvals.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const checkId = (id: string): string => {
  if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404);
  return id;
};

@Controller('v1/approvals')
export class ApprovalsController {
  constructor(private readonly approvals: ApprovalsService) {}

  @Get()
  @RequirePermission('approvals.read')
  list(
    @CurrentTx() tx: Tx,
    @Req() req: Request,
    @Query() q: { status?: string; action_type?: string; cursor?: string; limit?: string },
  ) {
    if (q.cursor !== undefined) checkId(q.cursor);
    return this.approvals.list(tx, req.principal!, q);
  }

  @Get(':id')
  @RequirePermission('approvals.read')
  get(@CurrentTx() tx: Tx, @Req() req: Request, @Param('id') id: string) {
    return this.approvals.get(tx, req.principal!, checkId(id));
  }

  /** The approve permission depends on the request's action type, so the service checks it (403 if missing). */
  @Post(':id/decisions')
  @HttpCode(200)
  @AuthenticatedOnly()
  decide(@CurrentTx() tx: Tx, @Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.approvals.decide(tx, req.principal!, checkId(id), body);
  }

  /** Only the requester may cancel; the service checks it. */
  @Post(':id/cancel')
  @HttpCode(200)
  @AuthenticatedOnly()
  cancel(@CurrentTx() tx: Tx, @Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.approvals.cancel(tx, req.principal!, checkId(id), body);
  }
}
