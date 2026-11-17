import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ControlService } from '../control/control.service';

/** The eight external dependency kinds the platform simulates. */
export const MOCK_KINDS = [
  'bank',
  'psp',
  'chain',
  'kyc',
  'sanctions',
  'fx',
  'price',
  'notification',
] as const;
export type MockKind = (typeof MOCK_KINDS)[number];

@Controller('mock')
export class PingController {
  constructor(private readonly control: ControlService) {}

  /**
   * Phase 2 provides only ping. Domain endpoints arrive with their phases. A scenario run can make it slow or failing
   * (`POST /mock/_control`); a failure is a 503 with the usual error body.
   */
  @Get(':kind/ping')
  async ping(@Param('kind') kind: string) {
    if (!(MOCK_KINDS as readonly string[]).includes(kind)) throw new NotFoundException();
    if ((await this.control.behave(kind)) === 'fail') {
      throw new ServiceUnavailableException({ kind, status: 'error', type: `mock:${kind}` });
    }
    return { kind, status: 'ok', type: `mock:${kind}` };
  }
}
