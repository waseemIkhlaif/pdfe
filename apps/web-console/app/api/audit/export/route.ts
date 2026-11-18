import { NotSignedInError, apiFetch } from '@pdfe/auth-web/server';

const ALLOWED = ['format', 'actor', 'action', 'tenant', 'from', 'to', 'correlation_id'] as const;

/**
 * The download of the audit export. The browser cannot send the user's token (it never has it), so the app asks the API on
 * the server and streams the file back with the API's own content type and name. Only the filters the API knows are passed on.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = new URLSearchParams();
  for (const name of ALLOWED) {
    const v = url.searchParams.get(name);
    if (v) q.set(name, v);
  }
  if (!['csv', 'json'].includes(q.get('format') ?? '')) {
    return new Response('format must be csv or json', { status: 400 });
  }
  let upstream: Response;
  try {
    upstream = await apiFetch(`/v1/audit/export?${q}`);
  } catch (err) {
    if (err instanceof NotSignedInError) {
      return new Response(null, { status: 302, headers: { Location: '/ar' } });
    }
    throw err;
  }
  const headers = new Headers();
  for (const h of ['content-type', 'content-disposition', 'x-correlation-id']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set('Cache-Control', 'no-store');
  return new Response(upstream.body, { status: upstream.status, headers });
}
