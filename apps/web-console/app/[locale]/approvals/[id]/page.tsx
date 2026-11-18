import { getTranslator } from '@pdfe/i18n/next';
import { BlockTitle, Card, KeyValue, Ltr, MakerCheckerPanel, Notice } from '@pdfe/ui-web';
import {
  Screen,
  callApi,
  localeOf,
  pageStateOf,
  stateOfFailure,
  type PageProps,
} from '@pdfe/web-kit';
import { ApprovalChip, When, compact, first, href } from '../../../../src/ui';
import { approve, reject } from './actions';

interface Approval {
  id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  payload: Record<string, unknown>;
  requested_by: string;
  reason: string;
  required_approvals: number;
  status: string;
  expires_at: string;
  created_at: string;
  correlation_id: string;
  decisions?: { decided_by: string; decision: string; reason: string; decided_at: string }[];
}

/** One approval request: what is asked, who asked, and the decision form (maker-checker). */
export default async function ApprovalPage({
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
  const ctx = { locale, path: `/approvals/${id}` };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('ui.approvals')}
      state={pageStateOf(sp.state)}
      render={async (me) => {
        const r = await callApi<Approval>(ctx, `/v1/approvals/${encodeURIComponent(id)}`);
        if (!r.ok) return stateOfFailure(locale, r, href(locale, ctx.path));
        const a = r.data;
        const mine = a.requested_by === me.user.id;
        const failure = first(sp.error);
        return (
          <>
            {failure === 'SELF_APPROVAL' ? (
              <Notice tone="warn">{t('ui.you-cannot-approve-your-own-request-ask-')}</Notice>
            ) : failure ? (
              <Notice tone="danger">{t('impl.approvals.refused')}</Notice>
            ) : null}
            <Card>
              <KeyValue
                rows={[
                  { label: t('ui.action'), value: <Ltr>{a.action_type}</Ltr> },
                  { label: t('ui.object'), value: <Ltr>{a.target_id ?? '—'}</Ltr> },
                  {
                    label: t('ui.status'),
                    value: <ApprovalChip locale={locale} status={a.status} />,
                  },
                  { label: t('ui.reason'), value: a.reason },
                  { label: t('ui.proposed-change'), value: <Ltr>{compact(a.payload)}</Ltr> },
                  { label: t('impl.created'), value: <When iso={a.created_at} /> },
                  { label: t('impl.expires'), value: <When iso={a.expires_at} /> },
                  { label: t('ui.correlation'), value: <Ltr>{a.correlation_id}</Ltr> },
                ]}
              />
            </Card>
            {a.decisions && a.decisions.length > 0 ? (
              <Card>
                <BlockTitle>{t('impl.approvals.decisions')}</BlockTitle>
                <KeyValue
                  rows={a.decisions.map((d) => ({
                    label: d.decision === 'approve' ? t('ui.approved') : t('impl.status.rejected'),
                    value: (
                      <>
                        <When iso={d.decided_at} /> — {d.reason}
                      </>
                    ),
                  }))}
                />
              </Card>
            ) : null}
            <MakerCheckerPanel
              text={{
                title: t('ui.approvals'),
                requester: t('ui.requester'),
                approver: t('ui.approver'),
                reason: t('ui.reason'),
                approve: t('ui.approve'),
                reject: t('ui.reject'),
                conflictTitle: t('ui.separation-of-duties'),
                conflictBody: t('ui.you-cannot-approve-your-own-request-ask-'),
              }}
              requester={mine ? t('ui.demo-user-a-same-person') : <Ltr>{a.requested_by}</Ltr>}
              approver={me.user.display_name}
              selfRequested={mine}
              decidable={a.status === 'pending'}
              approveAction={approve.bind(null, locale)}
              rejectAction={reject.bind(null, locale)}
              hidden={{ id: a.id }}
            />
          </>
        );
      }}
    />
  );
}
