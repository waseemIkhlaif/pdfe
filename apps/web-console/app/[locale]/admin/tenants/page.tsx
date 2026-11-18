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
import { When, href } from '../../../../src/ui';

interface TenantList {
  items: {
    id: string;
    code: string;
    name: string;
    kind: string;
    status: string;
    created_at: string;
  }[];
}

/** ADM-008: the tenants of the platform, read only. */
export default async function TenantsPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/admin/tenants' };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('screen.adm-008.title')}
      state={pageStateOf(sp.state)}
      render={async () => {
        const r = await callApi<TenantList>(ctx, '/v1/tenants');
        if (!r.ok) return stateOfFailure(locale, r, href(locale, ctx.path));
        if (r.data.items.length === 0) return stateBox(locale, 'empty');
        return (
          <Table
            caption={t('screen.adm-008.title')}
            columns={[
              { key: 'code', label: t('impl.code') },
              { key: 'name', label: t('ui.tenant') },
              { key: 'kind', label: t('impl.kind') },
              { key: 'status', label: t('ui.status') },
              { key: 'created', label: t('impl.created') },
            ]}
            rows={r.data.items.map((x) => ({
              code: <Ltr>{x.code}</Ltr>,
              name: x.name,
              kind: <Ltr>{x.kind}</Ltr>,
              status: x.status === 'active' ? t('ui.active') : x.status,
              created: <When iso={x.created_at} />,
            }))}
          />
        );
      }}
    />
  );
}
