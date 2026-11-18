'use server';

import { redirect } from 'next/navigation';
import type { Locale } from '@pdfe/i18n/next';
import { mutate } from '@pdfe/web-kit';

/** Starts a read-only elevation (limited in time, audited). A rule's refusal returns to the form. */
export async function startElevation(locale: Locale, formData: FormData): Promise<void> {
  const res = await mutate({ locale, path: '/elevation' }, '/v1/elevations', {
    target_tenant_id: String(formData.get('target_tenant_id') ?? ''),
    reason: String(formData.get('reason') ?? '').trim(),
  });
  redirect(`/${locale}/elevation${res.ok ? '' : `?error=${encodeURIComponent(res.code)}`}`);
}

/** Ends the elevation now. */
export async function endElevation(locale: Locale, id: string): Promise<void> {
  await mutate({ locale, path: '/elevation' }, `/v1/elevations/${encodeURIComponent(id)}/end`);
  redirect(`/${locale}/elevation`);
}
