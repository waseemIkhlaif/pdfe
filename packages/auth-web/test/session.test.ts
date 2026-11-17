import { getIronSession } from 'iron-session';
import { describe, expect, it } from 'vitest';
import {
  createAuthRoutes,
  safeReturnTo,
  sessionOptions,
  toPublicSession,
  type AuthConfig,
  type OidcClient,
  type SessionData,
} from '../src';

const ACCESS_TOKEN = 'ACCESS-TOKEN-SECRET-VALUE-1234567890';
const REFRESH_TOKEN = 'REFRESH-TOKEN-SECRET-VALUE-1234567890';
const ID_TOKEN = 'ID-TOKEN-SECRET-VALUE-1234567890';

const config: AuthConfig = {
  issuer: 'http://localhost:8080/realms/pdfe-demo',
  internalIssuer: 'http://keycloak:8080/realms/pdfe-demo',
  clientId: 'web-consumer',
  clientSecret: 'demo-secret-web-consumer',
  sessionSecret: 'a-test-only-session-secret-of-32-chars-or-more',
  appBaseUrl: 'http://localhost:3001',
  apiBaseUrl: 'http://api:4000',
  cookieName: 'pdfe_session',
  sessionTtlSeconds: 3600,
};

/** An identity provider that accepts one code and checks state and PKCE like the real one. */
function fakeOidc(): OidcClient {
  return {
    newFlow: () => ({ state: 'STATE-1', codeVerifier: 'VERIFIER-1' }),
    authorizationUrl: async ({ state, redirectUri }) =>
      `http://localhost:8080/realms/pdfe-demo/protocol/openid-connect/auth?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&code_challenge_method=S256`,
    exchangeCode: async ({ callbackUrl, state, codeVerifier }) => {
      const u = new URL(callbackUrl);
      if (u.searchParams.get('state') !== state) throw new Error('state mismatch');
      if (u.searchParams.get('code') !== 'GOOD-CODE' || codeVerifier !== 'VERIFIER-1') {
        throw new Error('bad code');
      }
      return {
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
        idToken: ID_TOKEN,
        expiresIn: 900,
        claims: { sub: 'sub-1', name: 'Demo Person', preferred_username: 'demo.person' },
      };
    },
    endSessionUrl: ({ idToken, postLogoutRedirectUri }) =>
      `http://localhost:8080/realms/pdfe-demo/protocol/openid-connect/logout?id_token_hint=${idToken ?? ''}&post_logout_redirect_uri=${encodeURIComponent(postLogoutRedirectUri)}`,
  };
}

const routes = () => createAuthRoutes(config, fakeOidc());

/** The cookie the browser would send back, from a response's Set-Cookie headers. */
const cookieFrom = (res: Response): string | undefined => {
  const raw = res.headers.getSetCookie().find((c) => c.startsWith('pdfe_session='));
  return raw?.split(';')[0];
};
const rawSetCookie = (res: Response) =>
  res.headers.getSetCookie().find((c) => c.startsWith('pdfe_session='))!;
const get = (path: string, cookie?: string) =>
  new Request(`${config.appBaseUrl}${path}`, { headers: cookie ? { cookie } : {} });

/** Runs sign-in and the callback; returns the cookie of the signed-in session. */
async function signedIn(returnTo = '/ar/home') {
  const r = routes();
  const start = await r.signIn(get(`/api/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`));
  const flowCookie = cookieFrom(start)!;
  const done = await r.callback(get('/api/auth/callback?code=GOOD-CODE&state=STATE-1', flowCookie));
  return { r, start, done, cookie: cookieFrom(done)! };
}

describe('session cookie', () => {
  it('is HttpOnly and SameSite=Lax, with a path, and not Secure on the local http demo', async () => {
    const { start, done } = await signedIn();
    for (const res of [start, done]) {
      const c = rawSetCookie(res);
      expect(c).toMatch(/;\s*HttpOnly/i);
      expect(c).toMatch(/;\s*SameSite=Lax/i);
      expect(c).toMatch(/;\s*Path=\//i);
      expect(c).not.toMatch(/;\s*Secure/i);
    }
  });

  it('is Secure when the app is served over https', async () => {
    const secure = { ...config, appBaseUrl: 'https://app.example.test' };
    const res = await createAuthRoutes(secure, fakeOidc()).signIn(
      new Request('https://app.example.test/api/auth/sign-in'),
    );
    expect(rawSetCookie(res)).toMatch(/;\s*Secure/i);
  });

  it('is encrypted: neither the flow secrets nor any token appear in it', async () => {
    const { start, done } = await signedIn();
    const flow = decodeURIComponent(cookieFrom(start)!);
    const auth = decodeURIComponent(cookieFrom(done)!);
    expect(auth.startsWith('pdfe_session=Fe26.')).toBe(true); // iron-session's sealed format
    for (const secret of ['STATE-1', 'VERIFIER-1']) expect(flow).not.toContain(secret);
    for (const secret of [ACCESS_TOKEN, REFRESH_TOKEN, ID_TOKEN, 'sub-1', 'Demo Person']) {
      expect(auth).not.toContain(secret);
    }
  });

  it('is refused when tampered with or sealed with another secret', async () => {
    const { cookie } = await signedIn();
    const tampered = cookie.slice(0, -4) + 'AAAA';
    for (const c of [tampered, 'pdfe_session=garbage']) {
      const session = await getIronSession<SessionData>(
        get('/x', c),
        new Response(),
        sessionOptions(config),
      );
      expect(session.auth).toBeUndefined();
    }
    const other = { ...config, sessionSecret: 'another-test-only-secret-of-32-chars-or-more' };
    const s = await getIronSession<SessionData>(
      get('/x', cookie),
      new Response(),
      sessionOptions(other),
    );
    expect(s.auth).toBeUndefined();
  });
});

describe('tokens stay on the server', () => {
  it('never appear in a redirect, a header other than the sealed cookie, or a body', async () => {
    const { start, done } = await signedIn();
    for (const res of [start, done]) {
      expect(await res.text()).toBe('');
      for (const [name, value] of res.headers.entries()) {
        if (name.toLowerCase() === 'set-cookie') continue;
        for (const secret of [ACCESS_TOKEN, REFRESH_TOKEN, ID_TOKEN])
          expect(value).not.toContain(secret);
      }
    }
    expect(done.headers.get('location')).toBe('http://localhost:3001/ar/home');
  });

  it('are in the session on the server, and absent from the public session a server component receives', async () => {
    const { cookie } = await signedIn();
    const session = await getIronSession<SessionData>(
      get('/x', cookie),
      new Response(),
      sessionOptions(config),
    );
    expect(session.auth?.accessToken).toBe(ACCESS_TOKEN); // the server can use it

    const now = Date.now();
    const view = toPublicSession(session, now);
    expect(view.signedIn).toBe(true);
    expect(view.user).toEqual({ sub: 'sub-1', name: 'Demo Person', username: 'demo.person' });
    const json = JSON.stringify(view);
    for (const secret of [ACCESS_TOKEN, REFRESH_TOKEN, ID_TOKEN])
      expect(json).not.toContain(secret);
    expect(Object.keys(view).sort()).toEqual(['expiresAt', 'signedIn', 'user']);
  });

  it('an expired session reads as signed out', async () => {
    const { cookie } = await signedIn();
    const session = await getIronSession<SessionData>(
      get('/x', cookie),
      new Response(),
      sessionOptions(config),
    );
    expect(toPublicSession(session, session.auth!.expiresAt + 1)).toEqual({ signedIn: false });
  });
});

describe('sign-in flow', () => {
  it('sends the browser to the identity provider with PKCE and the app callback, and keeps returnTo', async () => {
    const start = await routes().signIn(get('/api/auth/sign-in?returnTo=/en/wallet'));
    expect(start.status).toBe(302);
    const loc = new URL(start.headers.get('location')!);
    expect(loc.origin).toBe('http://localhost:8080');
    expect(loc.searchParams.get('code_challenge_method')).toBe('S256');
    expect(loc.searchParams.get('redirect_uri')).toBe('http://localhost:3001/api/auth/callback');
    const { done } = await signedIn('/en/wallet');
    expect(done.headers.get('location')).toBe('http://localhost:3001/en/wallet');
  });

  it('refuses a returnTo that leaves the site', () => {
    for (const bad of [
      '//evil.example',
      'https://evil.example/x',
      '/\\evil.example',
      '',
      undefined,
      'ar/home',
    ]) {
      expect(safeReturnTo(bad as string | undefined, '/ar')).toBe('/ar');
    }
    expect(safeReturnTo('/ar/home?x=1', '/ar')).toBe('/ar/home?x=1');
  });

  it('ends the flow and signs nobody in when the state is wrong or the code is bad', async () => {
    const r = routes();
    const start = await r.signIn(get('/api/auth/sign-in'));
    const flowCookie = cookieFrom(start)!;
    for (const q of ['code=GOOD-CODE&state=OTHER', 'code=STOLEN&state=STATE-1']) {
      const res = await r.callback(get(`/api/auth/callback?${q}`, flowCookie));
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe('http://localhost:3001/ar/sign-in?error=1');
      // The cookie is cleared, so the flow cannot be retried with the same state.
      expect(rawSetCookie(res)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    }
  });

  it('does nothing without a flow in progress (a callback replayed after sign-in finished)', async () => {
    const { r, cookie } = await signedIn();
    const res = await r.callback(get('/api/auth/callback?code=GOOD-CODE&state=STATE-1', cookie));
    expect(res.headers.get('location')).toBe('http://localhost:3001/ar');
    const session = await getIronSession<SessionData>(
      get('/x', cookie),
      new Response(),
      sessionOptions(config),
    );
    expect(session.flow).toBeUndefined();
  });
});

describe('sign-out', () => {
  it('clears the session cookie and ends the identity-provider session with the ID token as hint', async () => {
    const { r, cookie } = await signedIn();
    const out = await r.signOut(get('/api/auth/sign-out', cookie));
    expect(out.status).toBe(302);
    expect(rawSetCookie(out)).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    const loc = new URL(out.headers.get('location')!);
    expect(loc.pathname).toBe('/realms/pdfe-demo/protocol/openid-connect/logout');
    expect(loc.searchParams.get('id_token_hint')).toBe(ID_TOKEN);
    expect(loc.searchParams.get('post_logout_redirect_uri')).toBe('http://localhost:3001/ar');

    // What the browser holds afterwards is empty: nobody is signed in.
    const cleared = cookieFrom(out) ?? 'pdfe_session=';
    const after = await getIronSession<SessionData>(
      get('/x', cleared),
      new Response(),
      sessionOptions(config),
    );
    expect(toPublicSession(after, Date.now())).toEqual({ signedIn: false });
  });

  it('works without a session too', async () => {
    const out = await routes().signOut(get('/api/auth/sign-out'));
    expect(out.status).toBe(302);
  });
});
