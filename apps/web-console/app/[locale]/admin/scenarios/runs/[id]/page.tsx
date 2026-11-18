import { getTranslator } from '@pdfe/i18n/next';
import { Card, KeyValue, LinkButton, Ltr, StatusChip, Table } from '@pdfe/ui-web';
import {
  Screen,
  callApi,
  localeOf,
  pageStateOf,
  stateOfFailure,
  type PageProps,
} from '@pdfe/web-kit';
import { When, href } from '../../../../../../src/ui';

interface Run {
  id: string;
  scenario_code: string;
  manifest_version: string;
  seed: number;
  status: 'running' | 'succeeded' | 'failed';
  started_at: string;
  finished_at: string | null;
  result_digest: string | null;
  error_code: string | null;
  report: { tables: Record<string, { count: number }>; audit_events: number } | null;
}

/** A scenario run: its status, its digest (the same for the same seed on any machine), and what it created. */
export default async function RunPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams?: PageProps['searchParams'];
}) {
  const locale = await localeOf(params);
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: `/admin/scenarios/runs/${id}` };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('ui.last-run')}
      state={pageStateOf(sp.state)}
      render={async () => {
        const r = await callApi<Run>(ctx, `/v1/demo/runs/${encodeURIComponent(id)}`);
        if (!r.ok) return stateOfFailure(locale, r, href(locale, ctx.path));
        const run = r.data;
        return (
          <>
            <Card>
              <KeyValue
                rows={[
                  {
                    label: t('ui.scenario'),
                    value: <Ltr>{`${run.scenario_code} ${run.manifest_version}`}</Ltr>,
                  },
                  { label: t('ui.seed'), value: <Ltr>{run.seed}</Ltr> },
                  {
                    label: t('ui.status'),
                    value: (
                      <StatusChip
                        status={
                          run.status === 'succeeded'
                            ? 'completed'
                            : run.status === 'failed'
                              ? 'failed'
                              : 'pending'
                        }
                        label={
                          run.status === 'succeeded'
                            ? t('status.completed')
                            : run.status === 'failed'
                              ? t('status.failed')
                              : t('status.pending')
                        }
                      />
                    ),
                  },
                  {
                    label: t('impl.digest'),
                    value: run.result_digest ? <Ltr>{run.result_digest}</Ltr> : '—',
                  },
                  ...(run.error_code
                    ? [{ label: t('impl.errorCode'), value: <Ltr>{run.error_code}</Ltr> }]
                    : []),
                  { label: t('impl.started'), value: <When iso={run.started_at} /> },
                  { label: t('impl.finished'), value: <When iso={run.finished_at} /> },
                ]}
              />
            </Card>
            {run.report ? (
              <Table
                caption={t('impl.report')}
                columns={[
                  { key: 'table', label: t('ui.object') },
                  { key: 'count', label: t('impl.count') },
                ]}
                rows={Object.entries(run.report.tables).map(([table, v]) => ({
                  table: <Ltr>{table}</Ltr>,
                  count: <Ltr>{v.count}</Ltr>,
                }))}
              />
            ) : null}
            <LinkButton href={href(locale, '/admin/scenarios')}>
              {t('ui.run-a-scenario')}
            </LinkButton>
          </>
        );
      }}
    />
  );
}
