import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { Tx } from '@pdfe/platform-core/db';
import { RequirePermission } from '../identity/public.decorator';
import { CurrentTx } from '../tenancy/tenant-context.interceptor';
import { ConfigService } from './config.service';

@Controller('v1/config')
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @RequirePermission('config.read')
  list(@CurrentTx() tx: Tx) {
    return this.config.list(tx);
  }

  @Get(':key/versions')
  @RequirePermission('config.read')
  versions(@CurrentTx() tx: Tx, @Param('key') key: string) {
    return this.config.versions(tx, key);
  }

  @Get(':key/diff')
  @RequirePermission('config.read')
  diff(
    @CurrentTx() tx: Tx,
    @Param('key') key: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.config.diff(tx, key, from, to);
  }

  @Post(':key/versions')
  @RequirePermission('config.request')
  propose(
    @CurrentTx() tx: Tx,
    @Req() req: Request,
    @Param('key') key: string,
    @Body() body: unknown,
  ) {
    return this.config.propose(tx, req.principal!, key, body);
  }

  @Post(':key/rollback')
  @RequirePermission('config.request')
  rollback(
    @CurrentTx() tx: Tx,
    @Req() req: Request,
    @Param('key') key: string,
    @Body() body: unknown,
  ) {
    return this.config.rollback(tx, req.principal!, key, body);
  }
}
