import * as client from 'openid-client';
import type { AuthConfig } from './config';

export interface TokenResult {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  /** Verified ID-token claims. */
  claims: { sub: string; name?: string; preferred_username?: string; [k: string]: unknown };
}

/** What the handlers need from the identity provider. Tests replace it; production uses openid-client. */
export interface OidcClient {
  newFlow(): { state: string; codeVerifier: string };
  authorizationUrl(p: {
    state: string;
    codeVerifier: string;
    redirectUri: string;
    /** The demo user to start the hosted sign-in with (the role picker), already validated. */
    loginHint?: string;
    /** The page language, so the hosted page opens in it (`ui_locales`). */
    uiLocales?: string;
  }): Promise<string>;
  /** Exchanges the callback URL (with `code` and `state`) for tokens. Throws if state, PKCE or the ID token is wrong. */
  exchangeCode(p: {
    callbackUrl: string;
    state: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<TokenResult>;
  endSessionUrl(p: { idToken?: string; postLogoutRedirectUri: string }): string;
}

/**
 * openid-client over explicit server metadata. The browser is sent to the public address, while the token and key
 * requests go to the internal address, and the issuer both sides agree on is the public one.
 */
export function createOidcClient(config: AuthConfig): OidcClient {
  const base = `${config.internalIssuer}/protocol/openid-connect`;
  const pub = `${config.issuer}/protocol/openid-connect`;
  const oidc = new client.Configuration(
    {
      issuer: config.issuer,
      authorization_endpoint: `${pub}/auth`,
      token_endpoint: `${base}/token`,
      jwks_uri: `${base}/certs`,
      userinfo_endpoint: `${base}/userinfo`,
      end_session_endpoint: `${pub}/logout`,
      authorization_response_iss_parameter_supported: true,
    },
    config.clientId,
    { client_secret: config.clientSecret },
    client.ClientSecretPost(config.clientSecret),
  );
  // The demo stack speaks plain HTTP on localhost and between containers.
  if (config.issuer.startsWith('http:') || config.internalIssuer.startsWith('http:')) {
    client.allowInsecureRequests(oidc);
  }

  return {
    newFlow: () => ({ state: client.randomState(), codeVerifier: client.randomPKCECodeVerifier() }),
    async authorizationUrl({ state, codeVerifier, redirectUri, loginHint, uiLocales }) {
      const url = client.buildAuthorizationUrl(oidc, {
        redirect_uri: redirectUri,
        scope: 'openid',
        state,
        code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
        code_challenge_method: 'S256',
        ...(loginHint ? { login_hint: loginHint } : {}),
        ...(uiLocales ? { ui_locales: uiLocales } : {}),
      });
      return url.href;
    },
    async exchangeCode({ callbackUrl, state, codeVerifier }) {
      const tokens = await client.authorizationCodeGrant(oidc, new URL(callbackUrl), {
        pkceCodeVerifier: codeVerifier,
        expectedState: state,
      });
      const claims = tokens.claims();
      if (!claims?.sub) throw new Error('auth-web: the ID token has no subject');
      return {
        accessToken: tokens.access_token,
        ...(tokens.id_token ? { idToken: tokens.id_token } : {}),
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresIn: tokens.expires_in ?? 300,
        claims: claims as TokenResult['claims'],
      };
    },
    endSessionUrl({ idToken, postLogoutRedirectUri }) {
      return client.buildEndSessionUrl(oidc, {
        post_logout_redirect_uri: postLogoutRedirectUri,
        ...(idToken ? { id_token_hint: idToken } : {}),
      }).href;
    },
  };
}
