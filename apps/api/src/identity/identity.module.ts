import { Global, Module } from '@nestjs/common';
import { OIDC_OPTIONS } from '../core/tokens';
import { AuthGuard } from './auth.guard';
import { JwtVerifier, oidcOptionsFromEnv } from './jwt.verifier';
import { MeController } from './me.controller';
import { MfaGuard } from './mfa.guard';
import { PermissionsGuard } from './permissions.guard';
import { PrincipalService } from './principal.service';

@Global()
@Module({
  controllers: [MeController],
  providers: [
    { provide: OIDC_OPTIONS, useFactory: () => oidcOptionsFromEnv() },
    JwtVerifier,
    PrincipalService,
    AuthGuard,
    MfaGuard,
    PermissionsGuard,
  ],
  exports: [OIDC_OPTIONS, JwtVerifier, PrincipalService, AuthGuard, MfaGuard, PermissionsGuard],
})
export class IdentityModule {}
