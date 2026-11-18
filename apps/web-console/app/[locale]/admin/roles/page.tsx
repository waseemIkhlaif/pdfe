import { getTranslator } from '@pdfe/i18n/next';
import { Table } from '@pdfe/ui-web';
import {
  Screen,
  callApi,
  localeOf,
  pageStateOf,
  roleLabel,
  stateBox,
  stateOfFailure,
  type PageProps,
} from '@pdfe/web-kit';
import { href } from '../../../../src/ui';

interface RoleList {
  items: { code: string; privileged: boolean; permissions: string[]; conflicts: string[] }[];
}

/** ADM-002: every role, whether it needs a second factor, what it may do, and the roles it can never be combined with. */
export default async function RolesPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/admin/roles' };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('screen.adm-002.title')}
      state={pageStateOf(sp.state)}
      render={async () => {
        const roles = await callApi<RoleList>(ctx, '/v1/iam/roles');
        if (!roles.ok) return stateOfFailure(locale, roles, href(locale, ctx.path));
        if (roles.data.items.length === 0) return stateBox(locale, 'empty');
        return (
          <Table
            caption={t('screen.adm-002.title')}
            columns={[
              { key: 'role', label: t('ui.role') },
              { key: 'mfa', label: t('ui.mfa') },
              { key: 'permissions', label: t('ui.permissions') },
              { key: 'conflicts', label: t('ui.conflicts-with') },
            ]}
            rows={roles.data.items.map((r) => ({
              role: roleLabel(locale, r.code),
              mfa: r.privileged ? t('ui.on') : t('ui.not-required'),
              permissions: <bdi className="ltr">{r.permissions.length}</bdi>,
              conflicts: r.conflicts.map((c) => roleLabel(locale, c)).join(', ') || t('ui.none'),
            }))}
          />
        );
      }}
    />
  );
}
