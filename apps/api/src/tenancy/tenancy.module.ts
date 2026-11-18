import { Global, Module } from '@nestjs/common';
import { ElevatedReadInterceptor } from './elevated-read.interceptor';
import { ElevationController } from './elevation.controller';
import { ElevationService } from './elevation.service';
import { ReadOnlyElevationGuard } from './read-only-elevation.guard';
import { TenantsController } from './tenants.controller';
import { TenantContextInterceptor } from './tenant-context.interceptor';

@Global()
@Module({
  controllers: [ElevationController, TenantsController],
  providers: [
    ElevationService,
    ReadOnlyElevationGuard,
    TenantContextInterceptor,
    ElevatedReadInterceptor,
  ],
  exports: [
    ElevationService,
    ReadOnlyElevationGuard,
    TenantContextInterceptor,
    ElevatedReadInterceptor,
  ],
})
export class TenancyModule {}
