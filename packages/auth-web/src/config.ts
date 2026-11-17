export interface AuthConfig {
  /** The issuer as browsers and tokens see it (`iss`), for example http://localhost:8080/realms/pdfe-demo. */
  issuer: string;
  /** Where this server reaches the identity provider (inside Docker, http://keycloak:8080/realms/pdfe-demo). */
  internalIssuer: string;
  clientId: string;
  clientSecret: string;
  /** At least 32 characters. Encrypts the session cookie. */
  sessionSecret: string;
  /** Public address of this web app, for example http://localhost:3001. */
  appBaseUrl: string;
  /** The API, reached server-side only. */
  apiBaseUrl: string;
  cookieName: string;
  /** Session lifetime in seconds. */
  sessionTtlSeconds: number;
}

const REQUIRED = [
  'OIDC_PUBLIC_ISSUER',
  'OIDC_CLIENT_ID',
  'OIDC_CLIENT_SECRET',
  'SESSION_SECRET',
  'APP_BASE_URL',
  'API_BASE_URL',
] as const;

/** Reads the settings from the environment. A missing or too-short value stops the app with its name. */
export function authConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  for (const key of REQUIRED) {
    if (!env[key]) throw new Error(`auth-web: ${key} is not set`);
  }
  if (env.SESSION_SECRET!.length < 32) {
    throw new Error('auth-web: SESSION_SECRET must be at least 32 characters');
  }
  const issuer = env.OIDC_PUBLIC_ISSUER!.replace(/\/$/, '');
  return {
    issuer,
    internalIssuer: (env.OIDC_ISSUER ?? issuer).replace(/\/$/, ''),
    clientId: env.OIDC_CLIENT_ID!,
    clientSecret: env.OIDC_CLIENT_SECRET!,
    sessionSecret: env.SESSION_SECRET!,
    appBaseUrl: env.APP_BASE_URL!.replace(/\/$/, ''),
    apiBaseUrl: env.API_BASE_URL!.replace(/\/$/, ''),
    cookieName: env.SESSION_COOKIE_NAME ?? 'pdfe_session',
    sessionTtlSeconds: Number(env.SESSION_TTL_SECONDS ?? 8 * 3600),
  };
}
