import { Controller, Get, NotFoundException, Param } from '@nestjs/common';

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
  /** Phase 2 provides only ping. Domain endpoints arrive with their phases. */
  @Get(':kind/ping')
  ping(@Param('kind') kind: string) {
    if (!(MOCK_KINDS as readonly string[]).includes(kind)) throw new NotFoundException();
    return { kind, status: 'ok', type: `mock:${kind}` };
  }
}
