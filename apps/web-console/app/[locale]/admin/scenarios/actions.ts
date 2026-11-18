'use server';

import { redirect } from 'next/navigation';
import type { Locale } from '@pdfe/i18n/next';
import { mutate } from '@pdfe/web-kit';

/** Runs a scenario (it resets and seeds the demo data) and shows the finished run. */
export async function runScenario(locale: Locale, formData: FormData): Promise<void> {
  const [code, version] = String(formData.get('scenario') ?? '').split(':');
  const res = await mutate<{ id: string }>(
    { locale, path: '/admin/scenarios' },
    `/v1/demo/scenarios/${encodeURIComponent(code ?? '')}/runs`,
    { version, seed: Number(formData.get('seed')) },
  );
  if (res.ok) redirect(`/${locale}/admin/scenarios/runs/${res.data.id}`);
  redirect(`/${locale}/admin/scenarios?error=${encodeURIComponent(res.code)}`);
}
