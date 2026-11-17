import { Body, Controller, Get, HttpCode, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequirePermission } from '../identity/public.decorator';
import { AuditService } from './audit.service';

@Controller('v1/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /** Search by actor, action, tenant, time range or correlation ID. Newest first, at most 100 per page. */
  @Get('events')
  @RequirePermission('audit.read')
  events(@Query() query: unknown) {
    return this.audit.search(query);
  }

  /** Walks the chain and says whether it is intact, or names the first event that is not. Recorded as `audit.verified`. */
  @Post('verify')
  @HttpCode(200)
  @RequirePermission('audit.verify')
  verify(@Req() req: Request, @Body() body: unknown) {
    return this.audit.verify(req.principal!, body);
  }

  /** The matching events as CSV or JSON, streamed, with the simulation label. Recorded as `audit.exported`. */
  @Get('export')
  @RequirePermission('audit.export')
  async export(@Req() req: Request, @Res() res: Response, @Query() query: unknown): Promise<void> {
    const out = await this.audit.prepareExport(req.principal!, query);
    res.status(200);
    res.setHeader(
      'Content-Type',
      out.format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    try {
      for await (const chunk of out.chunks()) {
        if (!res.write(chunk)) await new Promise<void>((r) => res.once('drain', r));
      }
    } finally {
      res.end();
    }
  }
}
