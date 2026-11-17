import { getIronSession } from 'iron-session';
import { SystemClock } from '@pdfe/platform-core';
import { authConfigFromEnv, type AuthConfig } from './config';
import { createOidcClient, type OidcClient } from './oidc';
import { sessionOptions, type SessionData } from './session';

const clock = new SystemClock();

/** A local path only: `/ar/home` is fine, `//evil.example` and `https://evil.example` are not. */
export function safeReturnTo(value: string | null | undefined, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback;
  }
  return value;
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, 'Cache-Control': 'no-store' },
  });
}

export interface AuthRoutes {
  /** GET /api/auth/sign-in?returnTo=/ar/home  : starts the flow. */
  signIn: (req: Request) => Promise<Response>;
  /** GET /api/auth/callback : finishes the flow. */
  callback: (req: Request) => Promise<Response>;
  /** POST or GET /api/auth/sign-out : clears the session and ends the identity-provider session. */
  signOut: (req: Request) => Promise<Response>;
}

/**
 * The three route handlers of a web app, written against the Web `Request` and `Response`, so a Next route file is
 * `export const GET = routes.signIn`. Authorization Code with PKCE; the tokens go into the encrypted session cookie
 * and never into a response body, a redirect URL or a page.
 */
export function createAuthRoutes(
  config: AuthConfig,
  oidc: OidcClient = createOidcClient(config),
): AuthRoutes {
  const options = sessionOptions(config);
  const redirectUri = `${config.appBaseUrl}/api/auth/callback`;
  const home = (locale = 'ar') => `/${locale}`;

  return {
    async signIn(req) {
      const url = new URL(req.url);
      const res = redirect(config.appBaseUrl);
      const session = await getIronSession<SessionData>(req, res, options);
      const { state, codeVerifier } = oidc.newFlow();
      delete session.auth;
      session.flow = {
        state,
        codeVerifier,
        returnTo: safeReturnTo(url.searchParams.get('returnTo'), home()),
      };
      await session.save();
      res.headers.set(
        'Location',
        await oidc.authorizationUrl({ state, codeVerifier, redirectUri }),
      );
      return res;
    },

    async callback(req) {
      const url = new URL(req.url);
      const res = redirect(config.appBaseUrl + home());
      const session = await getIronSession<SessionData>(req, res, options);
      const flow = session.flow;
      if (!flow) return redirect(config.appBaseUrl + home()); // no flow in progress: nothing to finish
      try {
        // The URL the browser used is the public one; the library only reads `code`, `state` and `iss` from it.
        const callbackUrl = `${config.appBaseUrl}${url.pathname}${url.search}`;
        const t = await oidc.exchangeCode({
          callbackUrl,
          state: flow.state,
          codeVerifier: flow.codeVerifier,
          redirectUri,
        });
        delete session.flow;
        session.auth = {
          sub: t.claims.sub,
          ...(t.claims.name ? { name: t.claims.name } : {}),
          ...(t.claims.preferred_username ? { username: t.claims.preferred_username } : {}),
          accessToken: t.accessToken,
          ...(t.idToken ? { idToken: t.idToken } : {}),
          expiresAt: clock.now().getTime() + t.expiresIn * 1000,
        };
        await session.save();
        res.headers.set('Location', config.appBaseUrl + safeReturnTo(flow.returnTo, home()));
        return res;
      } catch {
        // A wrong state, a replayed code or a bad token: end the flow and start over. No detail is given away.
        session.destroy();
        const fail = redirect(`${config.appBaseUrl}${home()}/sign-in?error=1`);
        for (const c of res.headers.getSetCookie()) fail.headers.append('Set-Cookie', c);
        return fail;
      }
    },

    async signOut(req) {
      const res = redirect(config.appBaseUrl + home());
      const session = await getIronSession<SessionData>(req, res, options);
      const idToken = session.auth?.idToken;
      session.destroy();
      res.headers.set(
        'Location',
        oidc.endSessionUrl({
          ...(idToken ? { idToken } : {}),
          postLogoutRedirectUri: config.appBaseUrl + home(),
        }),
      );
      return res;
    },
  };
}

/**
 * The same routes, built from the environment on first use. A Next build imports the route files without the
 * runtime settings, so nothing may read them while the module loads.
 */
export function lazyAuthRoutes(): AuthRoutes {
  cached ??= createAuthRoutes(authConfigFromEnv());
  return cached;
}
let cached: AuthRoutes | undefined;
