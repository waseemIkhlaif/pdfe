import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '@pdfe/platform-core';
import {
  AuthenticatedOnly,
  ElevationControl,
  RequirePermission,
} from '../identity/public.decorator';
import { ElevationService } from './elevation.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('v1/elevations')
@ElevationControl()
export class ElevationController {
  constructor(private readonly elevations: ElevationService) {}

  @Post()
  @RequirePermission('tenant.elevate')
  start(@Req() req: Request, @Body() body: unknown) {
    return this.elevations.start(req.principal!, body);
  }

  @Get('current')
  @RequirePermission('tenant.elevate')
  async current(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const e = await this.elevations.current(req.principal!);
    if (!e) {
      res.status(204);
      return;
    }
    return e;
  }

  /** The owner ends it. The service checks ownership, so the route only needs a signed-in caller. */
  @Post(':id/end')
  @HttpCode(204)
  @AuthenticatedOnly()
  async end(@Req() req: Request, @Param('id') id: string): Promise<void> {
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404);
    await this.elevations.end(req.principal!, id);
  }
}
