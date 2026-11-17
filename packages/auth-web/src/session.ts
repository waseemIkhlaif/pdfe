import type { SessionOptions } from 'iron-session';
import type { AuthConfig } from './config';

/** What is stored, encrypted, in the session cookie. Tokens live here and nowhere a browser can read them. */
export interface SessionData {
  /** Between the redirect to the identity provider and the callback. */
  flow?: { state: string; codeVerifier: string; returnTo: string };
  auth?: {
    sub: string;
    name?: string;
    username?: string;
    accessToken: string;
    /** Kept for the logout hint. */
    idToken?: string;
    /** Milliseconds since the epoch. */
    expiresAt: number;
  };
}

/** The part of the session a server component may see and pass on: no tokens. */
export interface PublicSession {
  signedIn: boolean;
  user?: { sub: string; name?: string; username?: string };
  expiresAt?: number;
}

export function sessionOptions(config: AuthConfig): SessionOptions {
  return {
    password: config.sessionSecret,
    cookieName: config.cookieName,
    ttl: config.sessionTtlSeconds,
    // Keycloak's tokens are large; a sealed session can pass the 4 KB limit of one cookie.
    chunk: true,
    cookieOptions: {
      httpOnly: true,
      sameSite: 'lax',
      // Secure on https; the local demo runs on http://localhost.
      secure: config.appBaseUrl.startsWith('https:'),
      path: '/',
    },
  };
}

/** Drops the tokens. The only function that turns session data into something a page may receive. */
export function toPublicSession(data: SessionData, now: number): PublicSession {
  const a = data.auth;
  if (!a || a.expiresAt <= now) return { signedIn: false };
  return {
    signedIn: true,
    user: {
      sub: a.sub,
      ...(a.name ? { name: a.name } : {}),
      ...(a.username ? { username: a.username } : {}),
    },
    expiresAt: a.expiresAt,
  };
}
