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
import { compact, href } from '../../../../src/ui';

interface ConfigList {
  items: {
    key: string;
    description: string;
    safety_locked: boolean;
    active: { version: number; value: unknown } | null;
    pending_versions: number;
  }[];
}

/** ADM-003: every setting, its active value and version, and whether it can be changed at all. */
export default async function ConfigListPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/admin/config' };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('screen.adm-003.title')}
      state={pageStateOf(sp.state)}
      render={async () => {
        const r = await callApi<ConfigList>(ctx, '/v1/config');
        if (!r.ok) return stateOfFailure(locale, r, href(locale, ctx.path));
        if (r.data.items.length === 0) return stateBox(locale, 'empty');
        return (
          <Table
            caption={t('screen.adm-003.title')}
            columns={[
              { key: 'setting', label: t('ui.setting') },
              { key: 'value', label: t('ui.value') },
              { key: 'version', label: t('ui.version') },
              { key: 'state', label: t('ui.state') },
            ]}
            rows={r.data.items.map((i) => ({
              setting: (
                <a href={href(locale, `/admin/config/${i.key}`)}>
                  <Ltr>{i.key}</Ltr>
                </a>
              ),
              value: i.active ? <Ltr>{compact(i.active.value)}</Ltr> : '—',
              version: i.active ? <Ltr>{i.active.version}</Ltr> : '—',
              state: i.safety_locked
                ? t('ui.safety-locked')
                : i.pending_versions > 0
                  ? `${t('status.pending')} (${i.pending_versions})`
                  : t('ui.active'),
            }))}
          />
        );
      }}
    />
  );
}
