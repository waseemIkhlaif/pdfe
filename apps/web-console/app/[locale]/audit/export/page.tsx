import { getTranslator } from '@pdfe/i18n/next';
import { Card, Notice, SelectField, TextField } from '@pdfe/ui-web';
import { Screen, localeOf, pageStateOf, type PageProps } from '@pdfe/web-kit';

/** CMP-013: download the matching audit events as CSV or JSON. The file carries the simulation label (a watermark line). */
export default async function ExportPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/audit/export' };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('screen.cmp-013.title')}
      state={pageStateOf(sp.state)}
      render={() => (
        <>
          <Notice tone="sim">{t('sim.exports-carry-a-simulation-watermark')}</Notice>
          <Card>
            {/* A plain GET form to the app's own download route: it adds the user's token on the server and streams the file. */}
            <form method="get" action="/api/audit/export" className="form">
              <SelectField
                id="format"
                label={t('ui.format')}
                options={[
                  { value: 'csv', label: 'CSV' },
                  { value: 'json', label: 'JSON' },
                ]}
              />
              <TextField id="actor" label={t('ui.actor')} style={{ direction: 'ltr' }} />
              <TextField id="action" label={t('ui.action')} style={{ direction: 'ltr' }} />
              <TextField id="from" label={t('ui.from')} type="datetime-local" />
              <TextField id="to" label={t('ui.to')} type="datetime-local" />
              <TextField
                id="correlation_id"
                label={t('ui.correlation')}
                style={{ direction: 'ltr' }}
              />
              <div className="actions">
                <button className="btn primary" type="submit">
                  {t('ui.export')}
                </button>
              </div>
            </form>
          </Card>
        </>
      )}
    />
  );
}
