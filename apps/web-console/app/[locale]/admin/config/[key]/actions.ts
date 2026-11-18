'use server';

import { redirect } from 'next/navigation';
import type { Locale } from '@pdfe/i18n/next';
import { mutate } from '@pdfe/web-kit';

const back = (locale: Locale, key: string, tab: string, error?: string) =>
  `/${locale}/admin/config/${encodeURIComponent(key)}?tab=${tab}${error ? `&error=${encodeURIComponent(error)}` : ''}`;

/** Proposes a new value (`config.change` approval). A value that is not JSON, or a rule's refusal, returns to the form. */
export async function proposeChange(
  locale: Locale,
  key: string,
  formData: FormData,
): Promise<void> {
  let value: unknown;
  try {
    value = JSON.parse(String(formData.get('value') ?? ''));
  } catch {
    redirect(back(locale, key, 'request', 'CONFIG_INVALID'));
  }
  const at = String(formData.get('effective_from') ?? '');
  const res = await mutate<{ id: string }>(
    { locale, path: `/admin/config/${key}` },
    `/v1/config/${encodeURIComponent(key)}/versions`,
    {
      value,
      reason: String(formData.get('reason') ?? '').trim(),
      // The browser gives a local time without a zone; the demo runs on UTC.
      ...(at ? { effective_from: `${at.length === 16 ? `${at}:00` : at}Z` } : {}),
    },
  );
  if (res.ok) redirect(`/${locale}/approvals/${res.data.id}`);
  redirect(back(locale, key, 'request', res.code));
}

/** Asks to go back to an earlier version (`config.rollback` approval). */
export async function requestRollback(
  locale: Locale,
  key: string,
  formData: FormData,
): Promise<void> {
  const res = await mutate<{ id: string }>(
    { locale, path: `/admin/config/${key}` },
    `/v1/config/${encodeURIComponent(key)}/rollback`,
    {
      to_version: Number(formData.get('to_version')),
      reason: String(formData.get('reason') ?? '').trim(),
    },
  );
  if (res.ok) redirect(`/${locale}/approvals/${res.data.id}`);
  redirect(back(locale, key, 'rollback', res.code));
}
