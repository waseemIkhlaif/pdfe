import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditVerifier } from './audit.verifier';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditVerifier],
  exports: [AuditService, AuditVerifier],
})
export class AuditModule {}
