import { getTranslator } from '@pdfe/i18n/next';
import {
  BlockTitle,
  Button,
  Card,
  KeyValue,
  Ltr,
  Notice,
  SelectField,
  Switch,
  Table,
  Tabs,
  TextArea,
  TextField,
} from '@pdfe/ui-web';
import {
  Screen,
  callApi,
  localeOf,
  pageStateOf,
  stateBox,
  stateOfFailure,
  type PageProps,
} from '@pdfe/web-kit';
import { ConfigChip, When, compact, first, href } from '../../../../../src/ui';
import { proposeChange, requestRollback } from './actions';

interface Item {
  key: string;
  description: string;
  safety_locked: boolean;
  editable: boolean;
  active: { version: number; value: unknown } | null;
}
interface Versions {
  key: string;
  items: {
    version: number;
    value: unknown;
    status: string;
    effective_from: string;
    rollback_of_version: number | null;
    reason: string | null;
    created_by: string;
  }[];
}
interface Diff {
  patch: { op: string; path: string; value?: unknown }[];
}

const TABS = ['history', 'diff', 'request', 'rollback'] as const;
type Tab = (typeof TABS)[number];

/**
 * One setting: its history (ADM-004), the difference between two versions and the request for a change (ADM-005), and the
 * rollback (ADM-006); for the feature flags the switches (ADM-007). A safety-locked setting is read only, and says why.
 */
export default async function ConfigKeyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; key: string }>;
  searchParams?: PageProps['searchParams'];
}) {
  const locale = await localeOf(params);
  const { key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx = { locale, path: `/admin/config/${key}` };
  const tab: Tab = (TABS as readonly string[]).includes(first(sp.tab) ?? '')
    ? (first(sp.tab) as Tab)
    : 'history';
  const here = (tabName: Tab, extra: Record<string, string | undefined> = {}) =>
    href(locale, `/admin/config/${key}`, {
      tab: tabName === 'history' ? undefined : tabName,
      ...extra,
    });

  return (
    <Screen
      app="console"
      ctx={ctx}
      title={key === 'features.flags' ? t('screen.adm-007.title') : t('screen.adm-004.title')}
      state={pageStateOf(sp.state)}
      render={async (me) => {
        const [list, versions] = await Promise.all([
          callApi<{ items: Item[] }>(ctx, '/v1/config'),
          callApi<Versions>(ctx, `/v1/config/${encodeURIComponent(key)}/versions`),
        ]);
        if (!list.ok) return stateOfFailure(locale, list, href(locale, ctx.path));
        if (!versions.ok) return stateOfFailure(locale, versions, href(locale, ctx.path));
        const item = list.data.items.find((i) => i.key === key);
        if (!item) return stateBox(locale, 'empty');
        const canRequest = me.permissions.includes('config.request') && item.editable;
        const failure = first(sp.error);
        const history = versions.data.items;

        let body: React.ReactNode;
        if (tab === 'history') {
          const flags =
            key === 'features.flags' && item.active
              ? (item.active.value as Record<string, boolean>)
              : null;
          body = (
            <>
              {flags ? (
                <Card>
                  <BlockTitle>{t('ui.flag')}</BlockTitle>
                  {Object.entries(flags).map(([name, on]) => (
                    <Switch key={name} id={`flag-${name}`} label={name} checked={on} disabled />
                  ))}
                  <p className="muted">{t('ui.safety-locked-flags-cannot-be-changed-he')}</p>
                </Card>
              ) : null}
              <Table
                caption={t('ui.versions')}
                columns={[
                  { key: 'version', label: t('ui.version') },
                  { key: 'value', label: t('ui.value') },
                  { key: 'status', label: t('ui.status') },
                  { key: 'from', label: t('impl.effectiveFrom') },
                  { key: 'by', label: t('ui.actor') },
                ]}
                rows={history.map((v) => ({
                  version: <Ltr>{v.version}</Ltr>,
                  value: <Ltr>{compact(v.value)}</Ltr>,
                  status: <ConfigChip locale={locale} status={v.status} />,
                  from: <When iso={v.effective_from} />,
                  by: <Ltr>{v.created_by}</Ltr>,
                }))}
              />
            </>
          );
        } else if (tab === 'diff') {
          const nums = history.map((v) => v.version);
          const from = Number(first(sp.from) ?? nums[1] ?? nums[0]);
          const to = Number(first(sp.to) ?? nums[0]);
          const diff =
            nums.length > 1 || from === to
              ? await callApi<Diff>(
                  ctx,
                  `/v1/config/${encodeURIComponent(key)}/diff?from=${from}&to=${to}`,
                )
              : null;
          const options = nums.map((n) => ({ value: String(n), label: String(n) }));
          body = (
            <>
              <form
                method="get"
                className="form"
                style={{ flexDirection: 'row', alignItems: 'flex-end', maxInlineSize: 'none' }}
              >
                <input type="hidden" name="tab" value="diff" />
                <SelectField
                  id="from"
                  label={t('ui.from')}
                  options={options}
                  defaultValue={String(from)}
                />
                <SelectField
                  id="to"
                  label={t('ui.to')}
                  options={options}
                  defaultValue={String(to)}
                />
                <Button tone="primary">{t('impl.compare')}</Button>
              </form>
              {diff && diff.ok ? (
                <Table
                  caption={t('ui.proposed-change')}
                  columns={[
                    { key: 'op', label: t('ui.action') },
                    { key: 'path', label: t('ui.object') },
                    { key: 'value', label: t('ui.value') },
                  ]}
                  rows={
                    diff.data.patch.length === 0
                      ? [{ op: '—', path: '—', value: t('impl.noDifference') }]
                      : diff.data.patch.map((p) => ({
                          op: <Ltr>{p.op}</Ltr>,
                          path: <Ltr>{p.path || '/'}</Ltr>,
                          value: p.value === undefined ? '—' : <Ltr>{compact(p.value)}</Ltr>,
                        }))
                  }
                />
              ) : diff ? (
                stateOfFailure(locale, diff, here('diff'))
              ) : null}
            </>
          );
        } else if (tab === 'request') {
          body = canRequest ? (
            <form action={proposeChange.bind(null, locale, key)} className="form">
              <TextArea
                id="value"
                label={t('ui.proposed')}
                hint={t('impl.config.valueHint')}
                defaultValue={JSON.stringify(item.active?.value ?? null)}
                required
                style={{ direction: 'ltr', fontFamily: 'monospace' }}
              />
              <TextField
                id="effective_from"
                label={t('impl.effectiveFrom')}
                type="datetime-local"
                hint={t('impl.config.effectiveHint')}
              />
              <TextArea id="reason" label={t('ui.reason')} required />
              <div className="actions">
                <Button tone="primary">{t('ui.save')}</Button>
              </div>
            </form>
          ) : (
            <Notice tone="info">{t('impl.config.readOnly')}</Notice>
          );
        } else {
          const past = history.filter((v) => v.status === 'active' || v.status === 'superseded');
          body = canRequest ? (
            <form action={requestRollback.bind(null, locale, key)} className="form">
              <Notice tone="info">{t('ui.rolling-back-creates-a-new-version-histo')}</Notice>
              <SelectField
                id="to_version"
                label={t('ui.roll-back-to-version')}
                options={past.map((v) => ({
                  value: String(v.version),
                  label: `${v.version}: ${compact(v.value)}`,
                }))}
              />
              <TextArea id="reason" label={t('ui.reason')} required />
              <div className="actions">
                <Button tone="danger">{t('ui.request-rollback')}</Button>
              </div>
            </form>
          ) : (
            <Notice tone="info">{t('impl.config.readOnly')}</Notice>
          );
        }

        return (
          <>
            <KeyValue
              rows={[
                { label: t('ui.setting'), value: <Ltr>{item.key}</Ltr> },
                {
                  label: t('ui.current'),
                  value: item.active ? (
                    <>
                      <Ltr>{compact(item.active.value)}</Ltr> (
                      <Ltr>{`v${item.active.version}`}</Ltr>)
                    </>
                  ) : (
                    '—'
                  ),
                },
                {
                  label: t('ui.state'),
                  value: item.safety_locked ? t('ui.safety-locked') : t('ui.active'),
                },
              ]}
            />
            {item.safety_locked ? <Notice tone="warn">{t('impl.config.locked')}</Notice> : null}
            {failure === 'CONFIG_INVALID' ? (
              <Notice tone="danger">{t('impl.config.invalid')}</Notice>
            ) : failure === 'CONFIG_SAFETY_LOCKED' ? (
              <Notice tone="warn">{t('impl.config.locked')}</Notice>
            ) : failure ? (
              <Notice tone="danger">{t('impl.config.refused')}</Notice>
            ) : null}
            <Tabs
              label={t('impl.sections')}
              items={[
                { href: here('history'), label: t('ui.versions'), current: tab === 'history' },
                { href: here('diff'), label: t('impl.diff'), current: tab === 'diff' },
                {
                  href: here('request'),
                  label: t('ui.proposed-change'),
                  current: tab === 'request',
                },
                {
                  href: here('rollback'),
                  label: t('ui.request-rollback'),
                  current: tab === 'rollback',
                },
              ]}
            />
            {body}
          </>
        );
      }}
    />
  );
}
