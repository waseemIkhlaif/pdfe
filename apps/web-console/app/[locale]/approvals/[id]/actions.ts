'use server';

import { redirect } from 'next/navigation';
import type { Locale } from '@pdfe/i18n/next';
import { mutate } from '@pdfe/web-kit';

async function decide(
  locale: Locale,
  decision: 'approve' | 'reject',
  formData: FormData,
): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  const res = await mutate(
    { locale, path: `/approvals/${id}` },
    `/v1/approvals/${encodeURIComponent(id)}/decisions`,
    { decision, reason },
  );
  // A refusal by a rule (the requester approving their own request: 409 SELF_APPROVAL) comes back to the page with its code.
  redirect(
    `/${locale}/approvals/${encodeURIComponent(id)}${res.ok ? '' : `?error=${encodeURIComponent(res.code)}`}`,
  );
}

/** Approve: the server asks the API, which refuses the requester itself (the disabled button is only the courtesy). */
export async function approve(locale: Locale, formData: FormData): Promise<void> {
  return decide(locale, 'approve', formData);
}
export async function reject(locale: Locale, formData: FormData): Promise<void> {
  return decide(locale, 'reject', formData);
}
