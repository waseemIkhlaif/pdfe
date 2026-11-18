import { getTranslator } from '@pdfe/i18n/next';
import { Button, Card, Notice, SelectField, TextField } from '@pdfe/ui-web';
import {
  Screen,
  callApi,
  localeOf,
  pageStateOf,
  stateBox,
  stateOfFailure,
  type PageProps,
} from '@pdfe/web-kit';
import { first, href } from '../../../../src/ui';
import { runScenario } from './actions';

interface Scenarios {
  items: { code: string; version: string; title: { en: string; ar: string } }[];
}

/** OPS-002: run a scenario with a code, a version and a seed. A run resets the demo data and seeds it again. */
export default async function ScenariosPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/admin/scenarios' };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('screen.ops-002.title')}
      state={pageStateOf(sp.state)}
      render={async () => {
        const r = await callApi<Scenarios>(ctx, '/v1/demo/scenarios');
        if (!r.ok) return stateOfFailure(locale, r, href(locale, ctx.path));
        if (r.data.items.length === 0) return stateBox(locale, 'empty');
        const failure = first(sp.error);
        return (
          <>
            <Notice tone="sim">{t('sim.scenarios-use-synthetic-data-only-and-ru')}</Notice>
            {failure ? <Notice tone="danger">{t('impl.scenarios.refused')}</Notice> : null}
            <Card>
              <form action={runScenario.bind(null, locale)} className="form">
                <SelectField
                  id="scenario"
                  label={t('ui.scenario')}
                  options={r.data.items.map((s) => ({
                    value: `${s.code}:${s.version}`,
                    label: `${s.title[locale]} (${s.code} ${s.version})`,
                  }))}
                />
                <TextField
                  id="seed"
                  label={t('ui.seed')}
                  type="number"
                  min={0}
                  max={2147483647}
                  step={1}
                  defaultValue="42"
                  inputMode="numeric"
                  required
                  style={{ direction: 'ltr' }}
                />
                <div className="actions">
                  <Button tone="primary">{t('ui.run-scenario')}</Button>
                </div>
              </form>
            </Card>
          </>
        );
      }}
    />
  );
}
