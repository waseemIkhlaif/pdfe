import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { AppError } from '@pdfe/platform-core';
import { OIDC_OPTIONS } from '../core/tokens';

export interface OidcOptions {
  /** Accepted `iss` values: the address inside Docker and the public one. */
  issuers: string[];
  keys: JWTVerifyGetKey;
}

/** Reads OIDC_ISSUER (internal) and OIDC_PUBLIC_ISSUER; the key set is fetched lazily from the internal issuer. */
export function oidcOptionsFromEnv(env: NodeJS.ProcessEnv = process.env): OidcOptions {
  const internal = env.OIDC_ISSUER;
  const issuers = [internal, env.OIDC_PUBLIC_ISSUER].filter((x): x is string => !!x);
  const keys: JWTVerifyGetKey = internal
    ? createRemoteJWKSet(new URL(`${internal.replace(/\/$/, '')}/protocol/openid-connect/certs`))
    : () => {
        throw new Error('OIDC_ISSUER is not configured');
      };
  return { issuers, keys };
}

@Injectable()
export class JwtVerifier {
  constructor(@Inject(OIDC_OPTIONS) private readonly opts: OidcOptions) {}

  /** Verifies signature, issuer and expiry. Any failure is a 401 with no detail. */
  async verify(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.opts.keys, {
        issuer: this.opts.issuers,
        algorithms: ['RS256', 'ES256', 'PS256'],
        clockTolerance: 5,
      });
      return payload;
    } catch {
      throw new AppError('UNAUTHENTICATED', 401);
    }
  }
}
