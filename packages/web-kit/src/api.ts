import { notFound, redirect } from 'next/navigation';
import { ApiError, NotSignedInError, apiFetch, ensureOk, errorPath } from '@pdfe/auth-web/server';
import type { Locale } from '@pdfe/i18n';
import { SystemClock } from '@pdfe/platform-core';

/** The server's time now, as ISO text: a page hands it to a client component that counts down from it. */
export const serverNowIso = (): string => new SystemClock().now().toISOString();

/** Where a page is: its language and its path inside the language segment. Used to come back after a sign-in. */
export interface PageCtx {
  locale: Locale;
  /** `/admin/users` (without the locale). */
  path: string;
}

export interface Me {
  user: { id: string; display_name: string; locale: 'ar' | 'en' };
  tenant_id: string;
  tenant: { id: string; code: string; name: string };
  roles: string[];
  permissions: string[];
  mfa: boolean;
  elevation: {
    id: string;
    target_tenant_id: string;
    reason: string;
    started_at: string;
    expires_at: string;
  } | null;
}

/** What a page gets from the API: the data, or the reason it has none (each becomes a page state, never a crash). */
export type Loaded<T> =
  | { ok: true; data: T }
  | { ok: false; kind: 'denied' }
  | { ok: false; kind: 'error'; messageKey: string; correlationId?: string };

const signInPath = (ctx: PageCtx, hint?: string) =>
  `/api/auth/sign-in?returnTo=${encodeURIComponent(`/${ctx.locale}${ctx.path === '/' ? '' : ctx.path}`)}${hint ? `&login_hint=${encodeURIComponent(hint)}` : ''}`;

/**
 * Calls the API as the signed-in user and sorts the outcome into what a page can show. No session, or a token the API no
 * longer accepts (401), sends the user to sign in and back to this page. 403 is `denied`. Anything else is `error`, with the
 * correlation ID of the failed request. 404 is the page's own not-found. It never throws for an HTTP outcome.
 */
export async function callApi<T>(
  ctx: PageCtx,
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<Loaded<T>> {
  let res: Response;
  try {
    res = await apiFetch(path, init);
  } catch (err) {
    if (err instanceof NotSignedInError) redirect(signInPath(ctx));
    throw err;
  }
  if (res.status === 401) redirect(signInPath(ctx));
  if (res.status === 403) return { ok: false, kind: 'denied' };
  if (res.status === 404) notFound();
  try {
    await ensureOk(res);
  } catch (err) {
    if (err instanceof ApiError) {
      return {
        ok: false,
        kind: 'error',
        messageKey: err.messageKey,
        ...(err.correlationId ? { correlationId: err.correlationId } : {}),
      };
    }
    throw err;
  }
  return { ok: true, data: (await res.json()) as T };
}

/** The signed-in user (`/v1/me`): who they are, their tenant, roles and permissions. */
export const loadMe = (ctx: PageCtx): Promise<Loaded<Me>> => callApi<Me>(ctx, '/v1/me');

/**
 * Makes a change from a server action. A failure goes to the error page of the app with the correlation ID; success returns
 * the body. A 409 or 422 is a rule speaking (separation of duties, an invalid value), not a crash: the caller gets it as
 * `{ ok: false, code, status }` to show next to the form.
 */
export async function mutate<T = unknown>(
  ctx: PageCtx,
  path: string,
  body?: unknown,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
): Promise<
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; details: { path: string; message_key: string }[] }
> {
  let res: Response;
  try {
    res = await apiFetch(path, {
      method,
      ...(body !== undefined
        ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    });
  } catch (err) {
    if (err instanceof NotSignedInError) redirect(signInPath(ctx));
    throw err;
  }
  if (res.status === 401) redirect(signInPath(ctx));
  if (res.ok) {
    const text = await res.text();
    return { ok: true, data: (text ? JSON.parse(text) : null) as T };
  }
  const envelope = (await res
    .clone()
    .json()
    .catch(() => null)) as {
    error?: { code?: string; details?: { path: string; message_key: string }[] };
  } | null;
  if ([403, 409, 422].includes(res.status)) {
    return {
      ok: false,
      status: res.status,
      code: envelope?.error?.code ?? 'ERROR',
      details: envelope?.error?.details ?? [],
    };
  }
  try {
    await ensureOk(res);
  } catch (err) {
    if (err instanceof ApiError) redirect(errorPath(ctx.locale, err));
    throw err;
  }
  throw new Error('unreachable');
}
