import { getTranslator } from '@pdfe/i18n/next';
import { Button, Ltr, Table, TextField } from '@pdfe/ui-web';
import {
  Screen,
  callApi,
  localeOf,
  pageStateOf,
  stateBox,
  stateOfFailure,
  type PageProps,
} from '@pdfe/web-kit';
import { When, first, href } from '../../../src/ui';

interface Events {
  items: {
    seq: number;
    occurred_at: string;
    actor_role: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    correlation_id: string;
  }[];
  next_cursor: number | null;
}

const FILTERS = ['actor', 'action', 'from', 'to', 'correlation_id'] as const;

/** CMP-011: search the audit trail, newest first. Every filter the API has is a field; the paging is a link. */
export default async function AuditPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/audit' };
  const query = Object.fromEntries(FILTERS.map((f) => [f, first(sp[f])])) as Record<
    string,
    string | undefined
  >;
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('screen.cmp-011.title')}
      state={pageStateOf(sp.state)}
      render={async () => {
        const q = new URLSearchParams();
        for (const f of FILTERS) if (query[f]) q.set(f, query[f]!);
        const cursor = first(sp.cursor);
        if (cursor) q.set('cursor', cursor);
        const r = await callApi<Events>(ctx, `/v1/audit/events${q.size ? `?${q}` : ''}`);
        return (
          <>
            <form method="get" className="form" style={{ maxInlineSize: 'none' }}>
              <div className="grid">
                <TextField
                  id="actor"
                  label={t('ui.actor')}
                  defaultValue={query.actor ?? ''}
                  style={{ direction: 'ltr' }}
                />
                <TextField
                  id="action"
                  label={t('ui.action')}
                  defaultValue={query.action ?? ''}
                  style={{ direction: 'ltr' }}
                />
                <TextField
                  id="from"
                  label={t('ui.from')}
                  type="datetime-local"
                  defaultValue={query.from ?? ''}
                />
                <TextField
                  id="to"
                  label={t('ui.to')}
                  type="datetime-local"
                  defaultValue={query.to ?? ''}
                />
                <TextField
                  id="correlation_id"
                  label={t('ui.correlation')}
                  defaultValue={query.correlation_id ?? ''}
                  style={{ direction: 'ltr' }}
                />
              </div>
              <div className="actions">
                <Button tone="primary">{t('ui.search')}</Button>
              </div>
            </form>
            {!r.ok ? (
              stateOfFailure(locale, r, href(locale, ctx.path, query))
            ) : r.data.items.length === 0 ? (
              stateBox(locale, 'empty')
            ) : (
              <>
                <Table
                  caption={t('screen.cmp-011.title')}
                  columns={[
                    { key: 'seq', label: '#' },
                    { key: 'time', label: t('ui.time') },
                    { key: 'actor', label: t('ui.actor') },
                    { key: 'action', label: t('ui.action') },
                    { key: 'object', label: t('ui.object') },
                    { key: 'cid', label: t('ui.correlation') },
                  ]}
                  rows={r.data.items.map((e) => ({
                    seq: <Ltr>{e.seq}</Ltr>,
                    time: <When iso={e.occurred_at} />,
                    actor: e.actor_role ? <Ltr>{e.actor_role}</Ltr> : '—',
                    action: <Ltr>{e.action}</Ltr>,
                    object: e.target_id ? (
                      <Ltr>{`${e.target_type ?? ''} ${e.target_id}`.trim()}</Ltr>
                    ) : (
                      '—'
                    ),
                    cid: (
                      <a href={href(locale, ctx.path, { correlation_id: e.correlation_id })}>
                        <Ltr>{e.correlation_id}</Ltr>
                      </a>
                    ),
                  }))}
                />
                {r.data.next_cursor !== null ? (
                  <a
                    className="btn"
                    href={href(locale, ctx.path, { ...query, cursor: String(r.data.next_cursor) })}
                  >
                    {t('ui.next-page')}
                  </a>
                ) : null}
              </>
            )}
          </>
        );
      }}
    />
  );
}
