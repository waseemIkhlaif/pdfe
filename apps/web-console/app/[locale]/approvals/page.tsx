import { getTranslator } from '@pdfe/i18n/next';
import { Ltr, Table } from '@pdfe/ui-web';
import {
  Screen,
  callApi,
  localeOf,
  pageStateOf,
  stateBox,
  stateOfFailure,
  type PageProps,
} from '@pdfe/web-kit';
import { ApprovalChip, When, first, href } from '../../../src/ui';

interface ApprovalList {
  items: {
    id: string;
    action_type: string;
    target_id: string | null;
    requested_by: string;
    status: string;
    created_at: string;
  }[];
  next_cursor: string | null;
}

/** The approval requests the caller made or may decide, newest first. */
export default async function ApprovalsPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/approvals' };
  const status = first(sp.status);
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('ui.approvals')}
      state={pageStateOf(sp.state)}
      render={async () => {
        const q = new URLSearchParams();
        if (status) q.set('status', status);
        const cursor = first(sp.cursor);
        if (cursor) q.set('cursor', cursor);
        const r = await callApi<ApprovalList>(ctx, `/v1/approvals${q.size ? `?${q}` : ''}`);
        if (!r.ok) return stateOfFailure(locale, r, href(locale, ctx.path));
        if (r.data.items.length === 0) return stateBox(locale, 'empty');
        return (
          <>
            <Table
              caption={t('ui.approvals')}
              columns={[
                { key: 'action', label: t('ui.action') },
                { key: 'object', label: t('ui.object') },
                { key: 'status', label: t('ui.status') },
                { key: 'created', label: t('ui.time') },
              ]}
              rows={r.data.items.map((a) => ({
                action: (
                  <a href={href(locale, `/approvals/${a.id}`)}>
                    <Ltr>{a.action_type}</Ltr>
                  </a>
                ),
                object: a.target_id ? <Ltr>{a.target_id}</Ltr> : '—',
                status: <ApprovalChip locale={locale} status={a.status} />,
                created: <When iso={a.created_at} />,
              }))}
            />
            {r.data.next_cursor ? (
              <a
                className="btn"
                href={href(locale, ctx.path, {
                  ...(status ? { status } : {}),
                  cursor: r.data.next_cursor,
                })}
              >
                {t('ui.next-page')}
              </a>
            ) : null}
          </>
        );
      }}
    />
  );
}
