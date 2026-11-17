import { redirect } from 'next/navigation';
import { ErrorView, errorText } from '@pdfe/ui-web';
import {
  ApiError,
  NotSignedInError,
  apiFetch,
  correlationIdOf,
  isCorrelationId,
} from '@pdfe/auth-web/server';

/**
 * The screen for a failed call. It shows the correlation ID of the failed request with a button to copy it, so the
 * user can quote it and the logs, trace and audit event of that request can be found (SC-012). Unthemed: the
 * navigable-shells story styles it. With `?simulate=500` (DEMO) it asks the API for a failure to look at.
 */
export default async function ErrorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ cid?: string; simulate?: string; key?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  let correlationId = isCorrelationId(sp.cid) ? sp.cid : undefined;
  let messageKey =
    typeof sp.key === 'string' && /^errors\.[a-z_]+$/.test(sp.key) ? sp.key : 'errors.internal';

  if (sp.simulate === '500') {
    try {
      const res = await apiFetch('/v1/demo/simulate-error', { method: 'POST' });
      correlationId = await correlationIdOf(res);
      const body = (await res.json().catch(() => null)) as {
        error?: { message_key?: string };
      } | null;
      if (body?.error?.message_key) messageKey = body.error.message_key;
    } catch (err) {
      if (err instanceof NotSignedInError) {
        redirect(
          `/api/auth/sign-in?returnTo=${encodeURIComponent(`/${locale}/error?simulate=500`)}`,
        );
      }
      if (!(err instanceof ApiError)) throw err;
      correlationId = err.correlationId;
      messageKey = err.messageKey;
    }
  }

  return (
    <ErrorView text={errorText(locale, messageKey)} {...(correlationId ? { correlationId } : {})} />
  );
}
