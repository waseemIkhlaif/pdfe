'use server';

import { redirect } from 'next/navigation';
import type { Locale } from '@pdfe/i18n/next';
import { mutate } from '@pdfe/web-kit';

type Verified =
  | { result: 'ok'; from_seq: number; to_seq: number; events: number }
  | { result: 'broken'; seq: number; reason: string };

/** Verifies the chain (an auditor action, itself audited as `audit.verified`) and returns the result in the address. */
export async function verifyChain(locale: Locale, formData: FormData): Promise<void> {
  const num = (name: string) => {
    const v = Number(formData.get(name));
    return Number.isInteger(v) && v > 0 ? v : undefined;
  };
  const body = {
    ...(num('from_seq') ? { from_seq: num('from_seq') } : {}),
    ...(num('to_seq') ? { to_seq: num('to_seq') } : {}),
  };
  const res = await mutate<Verified>({ locale, path: '/audit/verify' }, '/v1/audit/verify', body);
  if (!res.ok) redirect(`/${locale}/audit/verify?result=error`);
  const d = res.data;
  redirect(
    d.result === 'ok'
      ? `/${locale}/audit/verify?result=ok&from=${d.from_seq}&to=${d.to_seq}&events=${d.events}`
      : `/${locale}/audit/verify?result=broken&seq=${d.seq}&reason=${encodeURIComponent(d.reason)}`,
  );
}
