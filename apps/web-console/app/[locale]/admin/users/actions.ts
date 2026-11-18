'use server';

import { redirect } from 'next/navigation';
import type { Locale } from '@pdfe/i18n/next';
import { mutate } from '@pdfe/web-kit';

/**
 * Asks for a role grant (maker-checker: this creates an approval request, nothing is granted yet). A separation-of-duties
 * conflict (409) comes back to the form with the role named; success goes to the approval.
 */
export async function requestRoleGrant(locale: Locale, formData: FormData): Promise<void> {
  const user = String(formData.get('user') ?? '');
  const role = String(formData.get('role_code') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  const ctx = { locale, path: '/admin/users' };
  const res = await mutate<{ id: string }>(
    ctx,
    `/v1/iam/users/${encodeURIComponent(user)}/role-grants`,
    {
      role_code: role,
      reason,
    },
  );
  if (res.ok) redirect(`/${locale}/approvals/${res.data.id}`);
  redirect(
    `/${locale}/admin/users?error=${encodeURIComponent(res.code)}&role=${encodeURIComponent(role)}`,
  );
}
