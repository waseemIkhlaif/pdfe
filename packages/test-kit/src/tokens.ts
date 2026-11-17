import {
  exportJWK,
  generateKeyPair,
  importJWK,
  SignJWT,
  type JWK,
  type JWTVerifyGetKey,
} from 'jose';

export interface TokenClaims {
  /** Keycloak `sub`: iam.users.external_subject. */
  sub: string;
  tenantId: string;
  /** Adds `otp` to `amr`, as Keycloak does after a second factor. */
  otp?: boolean;
  sessionId?: string;
  /** Seconds until expiry. Default 300. */
  expiresIn?: number;
}

/**
 * A throw-away token issuer for fast tests: it signs RS256 tokens shaped like the realm `pdfe-demo`
 * (`tenant_id`, `amr`, `sid`) and exposes the key set the API verifies against.
 * Tests that must prove the real realm (second factor, claim mapping) use the Keycloak container instead.
 */
export class LocalIssuer {
  readonly issuer = 'http://keycloak.test/realms/pdfe-demo';

  private constructor(
    private readonly privateKey: CryptoKey,
    private readonly publicJwk: JWK,
  ) {}

  static async create(): Promise<LocalIssuer> {
    const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
    const jwk = await exportJWK(publicKey);
    return new LocalIssuer(privateKey, { ...jwk, kid: 'test-key', alg: 'RS256', use: 'sig' });
  }

  /** For the API's OIDC options: resolves the one test key. */
  get keys(): JWTVerifyGetKey {
    return async () => importJWK(this.publicJwk, 'RS256');
  }

  async token(c: TokenClaims): Promise<string> {
    return new SignJWT({
      tenant_id: c.tenantId,
      amr: c.otp ? ['pwd', 'otp'] : ['pwd'],
      sid: c.sessionId ?? `sid-${c.sub}`,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(this.issuer)
      .setSubject(c.sub)
      .setIssuedAt()
      .setExpirationTime(`${c.expiresIn ?? 300}s`)
      .sign(this.privateKey);
  }
}
