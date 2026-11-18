import type { ReactNode } from 'react';
import type { Locale } from '@pdfe/i18n/next';
import { Ltr, StatusChip, type Status } from '@pdfe/ui-web';
import { getTranslator } from '@pdfe/i18n/next';

/** `2026-01-15 09:00 UTC`: a moment as the screens show it (left to right, Western digits, whatever the page language). */
export function When({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <>—</>;
  return <Ltr>{`${iso.slice(0, 16).replace('T', ' ')} UTC`}</Ltr>;
}

/** The value of a setting or a payload as one short line. */
export function compact(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text;
}

const APPROVAL_STATUS: Record<string, Status> = {
  pending: 'pending',
  approved: 'completed',
  rejected: 'failed',
  cancelled: 'reversed',
  expired: 'expired',
};

const CONFIG_STATUS: Record<string, Status> = {
  active: 'completed',
  pending_approval: 'pending',
  scheduled: 'held',
  superseded: 'reversed',
  rejected: 'failed',
  stale: 'expired',
  draft: 'draft',
};

/** Words for the statuses the deck does not have (scheduled, stale, superseded...) come from the extras. */
export function ApprovalChip({ locale, status }: { locale: Locale; status: string }) {
  const t = getTranslator(locale);
  const label: Record<string, string> = {
    pending: t('status.pending'),
    approved: t('ui.approved'),
    rejected: t('impl.status.rejected'),
    cancelled: t('impl.status.cancelled'),
    expired: t('status.expired'),
  };
  return (
    <StatusChip status={APPROVAL_STATUS[status] ?? 'pending'} label={label[status] ?? status} />
  );
}

export function ConfigChip({ locale, status }: { locale: Locale; status: string }) {
  const t = getTranslator(locale);
  const label: Record<string, string> = {
    active: t('ui.active'),
    pending_approval: t('status.pending'),
    scheduled: t('impl.status.scheduled'),
    superseded: t('impl.status.superseded'),
    rejected: t('impl.status.rejected'),
    stale: t('impl.status.stale'),
    draft: t('status.draft'),
  };
  return <StatusChip status={CONFIG_STATUS[status] ?? 'draft'} label={label[status] ?? status} />;
}

/** Wraps list content so an empty list shows the empty state. */
export function orEmpty(rows: unknown[], empty: ReactNode, content: ReactNode): ReactNode {
  return rows.length === 0 ? empty : content;
}

/** A path inside this app, with the language. */
export const href = (
  locale: Locale,
  path: string,
  query?: Record<string, string | undefined>,
): string => {
  const q = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join('&');
  return `/${locale}${path === '/' ? '' : path}${q ? `?${q}` : ''}`;
};

export const first = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;
