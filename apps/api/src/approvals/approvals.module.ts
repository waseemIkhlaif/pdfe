import { Global, Module } from '@nestjs/common';
import { ApprovalHandlerRegistry } from './approval-handler.registry';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';

@Global()
@Module({
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalHandlerRegistry],
  exports: [ApprovalsService, ApprovalHandlerRegistry],
})
export class ApprovalsModule {}
