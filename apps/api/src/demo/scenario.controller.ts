import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AppError, getContext } from '@pdfe/platform-core';
import { parseInput } from '../common/validate';
import { NoRequestTransaction, RequirePermission } from '../identity/public.decorator';
import { ScenarioRegistry } from './scenario-registry';
import { ScenarioRunner } from './scenario-runner';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runRequestSchema = z.object({
  version: z.string().regex(/^v[0-9]+$/),
  seed: z.number().int().min(0).max(2_147_483_647),
});

/**
 * Registered scenarios and their runs. A run resets the demo data and seeds it again; it does its own transactions (it
 * truncates tables the request itself would otherwise hold open), so these routes have no request transaction.
 */
@Controller('v1/demo')
export class ScenarioController {
  constructor(
    private readonly registry: ScenarioRegistry,
    private readonly runner: ScenarioRunner,
  ) {}

  @Get('scenarios')
  @RequirePermission('demo.scenario.run')
  @NoRequestTransaction()
  scenarios() {
    return this.registry.catalog();
  }

  @Post('scenarios/:code/runs')
  @RequirePermission('demo.scenario.run')
  @NoRequestTransaction()
  run(@Req() req: Request, @Param('code') code: string, @Body() body: unknown) {
    const input = parseInput(runRequestSchema, body);
    return this.runner.run({
      code,
      version: input.version,
      seed: input.seed,
      requestedBy: req.principal!.userId,
      correlationId: getContext()?.correlationId ?? 'unknown',
    });
  }

  @Get('runs/:id')
  @RequirePermission('demo.scenario.run')
  @NoRequestTransaction()
  getRun(@Param('id') id: string) {
    if (!UUID.test(id)) throw new AppError('NOT_FOUND', 404);
    return this.runner.get(id);
  }
}
