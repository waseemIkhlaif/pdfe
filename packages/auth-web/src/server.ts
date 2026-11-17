import 'server-only';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { IdGenerator, SystemClock, SystemRandom } from '@pdfe/platform-core';
import { authConfigFromEnv, type AuthConfig } from './config';
import { sessionOptions, toPublicSession, type PublicSession, type SessionData } from './session';

const clock = new SystemClock();
const ids = new IdGenerator(clock, new SystemRandom());
let cached: AuthConfig | undefined;
const config = (): AuthConfig => (cached ??= authConfigFromEnv());

export { ApiError, correlationIdOf, ensureOk, errorPath, isCorrelationId } from './api-error';

/** The caller has no session, or it has expired. A page turns this into a redirect to sign-in. */
export class NotSignedInError extends Error {
  constructor() {
    super('not signed in');
    this.name = 'NotSignedInError';
  }
}

async function rawSession(): Promise<SessionData> {
  const store = await cookies();
  // iron-session only reads here: a server component cannot set cookies. Writing happens in the route handlers.
  return getIronSession<SessionData>(store, sessionOptions(config()));
}

/**
 * The session as a server component may use it: who is signed in and until when. It has no tokens, so there is
 * nothing to leak into a prop or a response body.
 */
export async function getSession(): Promise<PublicSession> {
  return toPublicSession(await rawSession(), clock.now().getTime());
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Calls the API from the server with the user's bearer token, a fresh `X-Correlation-Id`, and, for a change, an
 * `Idempotency-Key` (pass your own to retry the same action). The token never leaves the server: this function
 * is not importable from a client component.
 */
export async function apiFetch(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<Response> {
  if (!path.startsWith('/') || path.startsWith('//'))
    throw new Error('apiFetch: path must start with a single /');
  const session = await rawSession();
  const auth = session.auth;
  if (!auth || auth.expiresAt <= clock.now().getTime()) throw new NotSignedInError();

  const { idempotencyKey, ...rest } = init;
  const method = (rest.method ?? 'GET').toUpperCase();
  const headers = new Headers(rest.headers);
  headers.set('Authorization', `Bearer ${auth.accessToken}`);
  if (!headers.has('X-Correlation-Id')) headers.set('X-Correlation-Id', `COR-${ids.next()}`);
  if (MUTATING.has(method) && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', idempotencyKey ?? ids.next());
  }
  return fetch(`${config().apiBaseUrl}${path}`, { ...rest, method, headers, cache: 'no-store' });
}
