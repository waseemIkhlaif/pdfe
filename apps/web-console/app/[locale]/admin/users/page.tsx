import { getTranslator } from '@pdfe/i18n/next';
import { Button, Card, BlockTitle, Notice, SelectField, Table, TextArea } from '@pdfe/ui-web';
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
import { requestRoleGrant } from './actions';
import { When, first, href } from '../../../../src/ui';

interface UserList {
  items: {
    id: string;
    display_name: string;
    status: string;
    created_at: string;
    roles: string[];
  }[];
}
interface RoleList {
  items: { code: string }[];
}

/** ADM-001: the users the caller can see, and the form that asks for a role to be granted (an approval, never directly). */
export default async function UsersPage({ params, searchParams }: PageProps) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: '/admin/users' };
  return (
    <Screen
      app="console"
      ctx={ctx}
      title={t('screen.adm-001.title')}
      state={pageStateOf(sp.state)}
      render={async (me) => {
        const [users, roles] = await Promise.all([
          callApi<UserList>(ctx, '/v1/iam/users'),
          callApi<RoleList>(ctx, '/v1/iam/roles'),
        ]);
        if (!users.ok) return stateOfFailure(locale, users, href(locale, ctx.path));
        if (!roles.ok) return stateOfFailure(locale, roles, href(locale, ctx.path));
        const canRequest = me.permissions.includes('iam.role.grant.request');
        const failure = first(sp.error);
        return (
          <>
            {failure === 'SOD_CONFLICT' ? (
              <Notice tone="warn">
                <b>{t('ui.separation-of-duties')}</b>{' '}
                {t('impl.users.sod', { role: first(sp.role) ?? '' })}
              </Notice>
            ) : failure ? (
              <Notice tone="danger">{t('impl.users.refused')}</Notice>
            ) : null}
            {users.data.items.length === 0 ? (
              stateBox(locale, 'empty')
            ) : (
              <Table
                caption={t('screen.adm-001.title')}
                columns={[
                  { key: 'name', label: t('ui.user') },
                  { key: 'roles', label: t('ui.role') },
                  { key: 'status', label: t('ui.status') },
                  { key: 'created', label: t('impl.created') },
                ]}
                rows={users.data.items.map((u) => ({
                  name: u.display_name,
                  roles: u.roles.map((r) => roleLabel(locale, r)).join(', ') || t('ui.none'),
                  status: u.status === 'active' ? t('ui.active') : u.status,
                  created: <When iso={u.created_at} />,
                }))}
              />
            )}
            {canRequest ? (
              <Card>
                <BlockTitle>{t('impl.users.requestRole')}</BlockTitle>
                <form action={requestRoleGrant.bind(null, locale)} className="form">
                  <SelectField
                    id="user"
                    label={t('ui.user')}
                    options={users.data.items.map((u) => ({ value: u.id, label: u.display_name }))}
                  />
                  <SelectField
                    id="role_code"
                    label={t('ui.role')}
                    options={roles.data.items.map((r) => ({
                      value: r.code,
                      label: roleLabel(locale, r.code),
                    }))}
                  />
                  <TextArea id="reason" label={t('ui.reason')} required />
                  <div className="actions">
                    <Button tone="primary">{t('impl.users.submit')}</Button>
                  </div>
                </form>
              </Card>
            ) : (
              <Notice tone="info">{t('impl.users.cannotRequest')}</Notice>
            )}
          </>
        );
      }}
    />
  );
}
