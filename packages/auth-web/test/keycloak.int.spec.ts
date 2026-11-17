import { getIronSession } from 'iron-session';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startKeycloak, totp, type KeycloakHandle } from '@pdfe/test-kit';
import { createAuthRoutes, sessionOptions, type AuthConfig, type SessionData } from '../src';

// The whole browser login against the real realm: the redirect, the Keycloak login page, the one-time password,
// the callback and the session. It proves the client settings of web-consumer (secret, PKCE, redirect URI).
let kc: KeycloakHandle;
let config: AuthConfig;

const decode = (s: string) => s.replace(/&amp;/g, '&');

/** A tiny browser: keeps Keycloak's cookies and follows its pages by hand. */
class Browser {
  private jar = new Map<string, string>();
  private store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const [k, ...v] = pair!.split('=');
      this.jar.set(k!, v.join('='));
    }
  }
  private cookie() {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  async request(url: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(url, {
      ...init,
      redirect: 'manual',
      headers: { ...(init.headers as Record<string, string>), cookie: this.cookie() },
    });
    this.store(res);
    return res;
  }
}

/**
 * Logs in as a demo user through Keycloak's own pages and returns the callback URL it ends up on.
 * Keycloak shows the password form, and for a console role the one-time password form after it.
 */
async function login(authUrl: string, username: string, pages: string[] = []): Promise<string> {
  const b = new Browser();
  let res = await b.request(authUrl);
  for (let i = 0; i < 8; i++) {
    if (res.status >= 300 && res.status < 400) {
      const next = new URL(res.headers.get('location')!, authUrl).href;
      if (next.startsWith(config.appBaseUrl)) return next; // arrived at the web app's callback
      res = await b.request(next);
      continue;
    }
    const html = await res.text();
    pages.push(html);
    const action = /<form[^>]+action="([^"]+)"/.exec(html)?.[1];
    if (!action) throw new Error(`login page has no form: ${html.slice(0, 300)}`);
    const body = new URLSearchParams();
    if (html.includes('name="otp"')) {
      const user = kc.users.find((u) => u.username === username)!;
      body.set('otp', totp(user.otpSecret!));
    } else {
      body.set('username', username);
      body.set('password', 'demo-password');
    }
    res = await b.request(decode(action), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }
  throw new Error('login did not finish');
}

const cookieFrom = (res: Response) =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith('pdfe_session='))
    ?.split(';')[0];

const readSession = (cookie: string) =>
  getIronSession<SessionData>(
    new Request(config.appBaseUrl, { headers: { cookie } }),
    new Response(),
    sessionOptions(config),
  );

beforeAll(async () => {
  kc = await startKeycloak();
  config = {
    issuer: kc.issuer,
    internalIssuer: kc.issuer, // the test reaches Keycloak at one address
    clientId: 'web-consumer',
    clientSecret: 'demo-secret-web-consumer',
    sessionSecret: 'an-integration-test-secret-of-32-chars-or-more',
    appBaseUrl: 'http://localhost:3001',
    apiBaseUrl: 'http://localhost:4000',
    cookieName: 'pdfe_session',
    sessionTtlSeconds: 3600,
  };
});
afterAll(async () => {
  await kc?.stop();
});

describe('sign-in through the real realm', () => {
  it('a non-privileged user signs in with a password and gets a session with their token', async () => {
    const routes = createAuthRoutes(config);
    const start = await routes.signIn(
      new Request(`${config.appBaseUrl}/api/auth/sign-in?returnTo=/en/home`),
    );
    expect(start.status).toBe(302);
    const callbackUrl = await login(start.headers.get('location')!, 'demo.individual');

    const done = await routes.callback(
      new Request(callbackUrl, { headers: { cookie: cookieFrom(start)! } }),
    );
    expect(done.status).toBe(302);
    expect(done.headers.get('location')).toBe('http://localhost:3001/en/home');

    const session = await readSession(cookieFrom(done)!);
    const user = kc.users.find((u) => u.username === 'demo.individual')!;
    expect(session.auth?.sub).toBe(user.subject);
    expect(session.auth?.username).toBe('demo.individual');
    const claims = JSON.parse(
      Buffer.from(session.auth!.accessToken.split('.')[1]!, 'base64url').toString(),
    );
    // Keycloak lists a method only for a completed factor in the browser flow; what matters is that there is no otp.
    expect(claims.amr ?? []).not.toContain('otp');
    expect(claims.tenant_id).toBe(user.tenantId);
  });

  it('a console role is asked for the one-time password, and its token shows otp', async () => {
    const routes = createAuthRoutes(config);
    const start = await routes.signIn(new Request(`${config.appBaseUrl}/api/auth/sign-in`));
    const callbackUrl = await login(start.headers.get('location')!, 'demo.auditor');
    // The token is issued some seconds after the one-time password was checked. Keycloak lists a method in `amr`
    // only while its reference is younger than the configured max age, so a slow exchange must still show otp.
    await new Promise((r) => setTimeout(r, 3000));
    const done = await routes.callback(
      new Request(callbackUrl, { headers: { cookie: cookieFrom(start)! } }),
    );
    expect(done.headers.get('location')).toBe('http://localhost:3001/ar');
    const session = await readSession(cookieFrom(done)!);
    const claims = JSON.parse(
      Buffer.from(session.auth!.accessToken.split('.')[1]!, 'base64url').toString(),
    );
    expect(claims.amr).toEqual(['pwd', 'otp']);
  });

  it('a callback with a different state than the flow started with signs nobody in', async () => {
    const routes = createAuthRoutes(config);
    const start = await routes.signIn(new Request(`${config.appBaseUrl}/api/auth/sign-in`));
    const callbackUrl = new URL(await login(start.headers.get('location')!, 'demo.individual'));
    callbackUrl.searchParams.set('state', 'forged-state');
    const res = await routes.callback(
      new Request(callbackUrl, { headers: { cookie: cookieFrom(start)! } }),
    );
    expect(res.headers.get('location')).toBe('http://localhost:3001/ar/sign-in?error=1');
  });

  it('a code cannot be used twice', async () => {
    const routes = createAuthRoutes(config);
    const start = await routes.signIn(new Request(`${config.appBaseUrl}/api/auth/sign-in`));
    const callbackUrl = await login(start.headers.get('location')!, 'demo.individual');
    const flowCookie = cookieFrom(start)!;
    const first = await routes.callback(
      new Request(callbackUrl, { headers: { cookie: flowCookie } }),
    );
    expect(first.headers.get('location')).toBe('http://localhost:3001/ar');
    // Replaying the same callback with the original flow cookie: Keycloak refuses the used code.
    const replay = await routes.callback(
      new Request(callbackUrl, { headers: { cookie: flowCookie } }),
    );
    expect(replay.headers.get('location')).toBe('http://localhost:3001/ar/sign-in?error=1');
  });

  it('sign-out ends the Keycloak session and returns to the app', async () => {
    const routes = createAuthRoutes(config);
    const start = await routes.signIn(new Request(`${config.appBaseUrl}/api/auth/sign-in`));
    const callbackUrl = await login(start.headers.get('location')!, 'demo.individual');
    const done = await routes.callback(
      new Request(callbackUrl, { headers: { cookie: cookieFrom(start)! } }),
    );
    const out = await routes.signOut(
      new Request(`${config.appBaseUrl}/api/auth/sign-out`, {
        headers: { cookie: cookieFrom(done)! },
      }),
    );
    const logout = await fetch(out.headers.get('location')!, { redirect: 'manual' });
    expect([200, 302]).toContain(logout.status);
    if (logout.status === 302)
      expect(logout.headers.get('location')).toBe('http://localhost:3001/ar');
  });
});

describe('the login pages show the simulation banner', () => {
  const bannerIn = (html: string) => {
    const m = /<div role="status" data-sim="1"[^>]*>(.*?)<\/div>/s.exec(html);
    expect(m, 'banner').not.toBeNull();
    // Both strings are in the markup; the page language decides which one is shown.
    expect(m![1]).toContain(`>${SIM_LABEL_EN}</bdi>`);
    expect(m![1]).toContain(`>${SIM_LABEL_AR}</bdi>`);
    expect(m![1]).toContain('html[lang="ar"] .pdfe-sim-en');
    expect(html).toMatch(/<html[^>]* lang="(ar|en)"/);
    // The banner comes before the page header and the form.
    expect(html.indexOf('data-sim="1"')).toBeLessThan(html.indexOf('kc-header'));
  };
  const authUrl = async (lang?: string) => {
    const start = await createAuthRoutes(config).signIn(
      new Request(`${config.appBaseUrl}/api/auth/sign-in`),
    );
    return `${start.headers.get('location')}${lang ? `&kc_locale=${lang}` : ''}`;
  };

  it.each(['en', 'ar'])('the password page, in %s', async (lang) => {
    const pages: string[] = [];
    const b = new Browser();
    const res = await b.request(await authUrl(lang));
    // Follow Keycloak's own redirects to the login form.
    let r = res;
    for (let i = 0; i < 4 && r.status >= 300 && r.status < 400; i++) {
      r = await b.request(new URL(r.headers.get('location')!, config.issuer).href);
    }
    pages.push(await r.text());
    bannerIn(pages[0]!);
    expect(pages[0]).toContain(lang === 'ar' ? 'dir="rtl"' : 'dir="ltr"');
  });

  it('the one-time-password page of a console role', async () => {
    const pages: string[] = [];
    // A different console user from the sign-in tests: Keycloak refuses a one-time code used twice in its 30-second window.
    await login(await authUrl(), 'demo.ops_analyst', pages);
    const otp = pages.find((p) => p.includes('name="otp"'));
    expect(otp, 'the OTP page was shown').toBeDefined();
    bannerIn(otp!);
  });

  it('the page after a wrong password', async () => {
    const b = new Browser();
    let r = await b.request(await authUrl('en'));
    for (let i = 0; i < 4 && r.status >= 300 && r.status < 400; i++) {
      r = await b.request(new URL(r.headers.get('location')!, config.issuer).href);
    }
    const html = await r.text();
    const action = decode(/<form[^>]+action="([^"]+)"/.exec(html)![1]!);
    const bad = await b.request(action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: 'demo.individual', password: 'wrong-password' }),
    });
    expect(bad.status).toBe(200);
    bannerIn(await bad.text());
  });
});
