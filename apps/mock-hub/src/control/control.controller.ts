import { timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { z } from 'zod';
import { ControlService } from './control.service';
import { MOCK_KINDS } from '../mocks/ping.controller';

const bodySchema = z.object({
  seed: z.number().int().min(0),
  entries: z.array(
    z.object({
      kind: z.enum(MOCK_KINDS),
      latency_ms: z.number().int().min(0).max(10_000),
      failure_rate: z.number().min(0).max(1),
      script: z.array(z.enum(['ok', 'fail'])).optional(),
    }),
  ),
});

/** Constant-time comparison; a missing token on either side never matches. */
function sameToken(given: string | undefined, expected: string | undefined): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Lets a scenario run set how the mocks behave (latency, failures, scripted outcomes). Internal only: it needs the scenario
 * token (`SCENARIO_TOKEN`, shared with the api through the deployment environment). Without a configured token it refuses
 * every call.
 */
@Controller('mock/_control')
export class ControlController {
  constructor(private readonly control: ControlService) {}

  @Post()
  @HttpCode(200)
  set(@Headers('x-scenario-token') token: string | undefined, @Body() body: unknown) {
    if (!sameToken(token, process.env.SCENARIO_TOKEN)) throw new ForbiddenException();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new UnprocessableEntityException(parsed.error.issues.map((i) => i.path.join('.')));
    }
    this.control.configure(parsed.data.seed, parsed.data.entries);
    return { configured: parsed.data.entries.map((e) => e.kind) };
  }

  @Get()
  get(@Headers('x-scenario-token') token: string | undefined) {
    if (!sameToken(token, process.env.SCENARIO_TOKEN)) throw new ForbiddenException();
    return Object.fromEntries(MOCK_KINDS.map((k) => [k, this.control.current(k)]));
  }
}
