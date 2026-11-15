import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HEALTH_CHECKS, type HealthCheck } from './health.checks';

const version: string = (
  JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8')) as { version: string }
).version;

@Controller('v1')
export class HealthController {
  constructor(@Inject(HEALTH_CHECKS) private readonly checks: HealthCheck[]) {}

  /** Public. Liveness and readiness; always reports the mode. Adapter types are listed once the registry exists. */
  @Get('health')
  async health(@Res({ passthrough: true }) res: Response) {
    const results = await Promise.all(
      this.checks.map(async (c) => [c.name, (await c.check()) ? 'up' : 'down'] as const),
    );
    const checks = Object.fromEntries(results);
    const ok = results.every(([, s]) => s === 'up');
    res.status(ok ? 200 : 503);
    return { status: ok ? 'ok' : 'degraded', mode: 'DEMO', checks, adapters: [] as string[] };
  }

  /** Public. API version and build. */
  @Get('meta')
  meta() {
    return { api: 'v1', version, build: process.env.BUILD_SHA ?? 'dev' };
  }
}
