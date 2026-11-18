import { getTranslator } from '@pdfe/i18n/next';
import {
  Button,
  Card,
  KeyValue,
  Ltr,
  Notice,
  SelectField,
  TextArea,
  TextField,
} from '@pdfe/ui-web';
import {
  Screen,
  callApi,
  localeOf,
  pageStateOf,
  serverNowIso,
  type PageProps,
} from '@pdfe/web-kit';
import { Countdown } from '../../../src/Countdown';
import { When, first } from '../../../src/ui';
import { endElevation, startElevation } from './actions';

interface Tenants {
  items: { id: string; name: string; code: string }[];
}

/**
 * Read-only elevation into another tenant (FR-013a): choose a tenant, give a reason, see the time left, end it. While it is
 * active every page shows the "read-only elevation" badge, every read is audited, and nothing can be changed.
 */
export default async function ElevationPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/elevation' };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('impl.elevation.title')}
      state={pageStateOf(sp.state)}
      render={async (me) => {
        const failure = first(sp.error);
        const notice = failure ? (
          <Notice tone="danger">{t('impl.elevation.refused')}</Notice>
        ) : null;

        if (me.elevation) {
          const e = me.elevation;
          return (
            <>
              {notice}
              <Notice tone="warn">{t('impl.elevation.active')}</Notice>
              <Card>
                <KeyValue
                  rows={[
                    { label: t('ui.tenant'), value: <Ltr>{e.target_tenant_id}</Ltr> },
                    { label: t('ui.reason'), value: e.reason },
                    { label: t('impl.expires'), value: <When iso={e.expires_at} /> },
                    {
                      label: t('impl.timeLeft'),
                      value: (
                        <Countdown
                          expiresAt={e.expires_at}
                          serverNow={serverNowIso()}
                          endedLabel={t('impl.elevation.ended')}
                        />
                      ),
                    },
                  ]}
                />
                <form
                  action={endElevation.bind(null, locale, e.id)}
                  className="actions"
                  style={{ marginBlockStart: 'var(--pdfe-space-12)' }}
                >
                  <Button tone="danger">{t('impl.elevation.end')}</Button>
                </form>
              </Card>
            </>
          );
        }

        const tenants = await callApi<Tenants>(ctx, '/v1/tenants');
        return (
          <>
            {notice}
            <Notice tone="info">{t('impl.elevation.explain')}</Notice>
            <Card>
              <form action={startElevation.bind(null, locale)} className="form">
                {tenants.ok ? (
                  <SelectField
                    id="target_tenant_id"
                    label={t('ui.tenant')}
                    options={tenants.data.items
                      .filter((x) => x.id !== me.tenant_id)
                      .map((x) => ({ value: x.id, label: `${x.name} (${x.code})` }))}
                  />
                ) : (
                  <TextField
                    id="target_tenant_id"
                    label={t('ui.tenant')}
                    style={{ direction: 'ltr' }}
                    required
                  />
                )}
                <TextArea
                  id="reason"
                  label={t('ui.reason')}
                  hint={t('impl.elevation.reasonHint')}
                  minLength={10}
                  required
                />
                <div className="actions">
                  <Button tone="primary">{t('impl.elevation.start')}</Button>
                </div>
              </form>
            </Card>
          </>
        );
      }}
    />
  );
}
