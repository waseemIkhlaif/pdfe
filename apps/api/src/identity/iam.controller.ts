import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '@pdfe/platform-core';
import type { Tx } from '@pdfe/platform-core/db';
import { CurrentTx } from '../tenancy/tenant-context.interceptor';
import { IamService } from './iam.service';
import { RequirePermission } from './public.decorator';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const checkId = (id: string): string => {
  if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404);
  return id;
};

@Controller('v1/iam')
export class IamController {
  constructor(private readonly iam: IamService) {}

  @Get('users')
  @RequirePermission('iam.read')
  users(@CurrentTx() tx: Tx, @Req() req: Request) {
    return this.iam.listUsers(tx, req.principal!);
  }

  @Get('roles')
  @RequirePermission('iam.read')
  roles() {
    return this.iam.listRoles();
  }

  @Post('users/:id/role-grants')
  @RequirePermission('iam.role.grant.request')
  grant(@CurrentTx() tx: Tx, @Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.iam.requestGrant(tx, req.principal!, checkId(id), body);
  }

  @Post('users/:id/role-revocations')
  @RequirePermission('iam.role.grant.request')
  revoke(@CurrentTx() tx: Tx, @Req() req: Request, @Param('id') id: string, @Body() body: unknown) {
    return this.iam.requestRevoke(tx, req.principal!, checkId(id), body);
  }
}
