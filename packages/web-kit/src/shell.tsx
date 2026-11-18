import type { ReactNode } from 'react';
import { getTranslator, type Locale, type MessageKey } from '@pdfe/i18n/next';
import {
  AppShell,
  EnvBadge,
  LanguagePill,
  PageHead,
  RoleBadge,
  StateBox,
  TenantBadge,
  type NavItem,
} from '@pdfe/ui-web';
import { loadMe, type Loaded, type Me, type PageCtx } from './api';
import { CONSUMER_TABS, currentPath, visibleNav, type AppId, type NavDef } from './nav';

export { PAGE_STATES, pageStateOf, type PageState } from './state';
export { roleLabel } from './labels';
import { roleLabel } from './labels';
import type { PageState } from './state';

const LANGUAGE_NAME = { ar: 'AR · العربية', en: 'EN · English' } as const;

/** The box that stands in for the page content when a page is not populated. */
export function stateBox(
  locale: Locale,
  state: Exclude<PageState, 'populated'> | 'empty',
  opts: { correlationId?: string; backHref?: string; retryHref?: string } = {},
): ReactNode {
  const t = getTranslator(locale);
  switch (state) {
    case 'loading':
      return <StateBox kind="loading" label={t('ui.loading')} />;
    case 'empty':
      return (
        <StateBox
          kind="empty"
          title={t('ui.nothing-here-yet')}
          body={t('sim.new-simulated-items-will-appear-here')}
        />
      );
    case 'denied':
      return (
        <StateBox
          kind="denied"
          title={t('ui.you-do-not-have-access')}
          body={t('ui.ask-an-administrator-for-access-to-this-')}
          back={{ label: t('ui.go-back'), href: opts.backHref ?? `/${locale}` }}
        />
      );
    case 'error':
      return (
        <StateBox
          kind="error"
          title={t('ui.something-went-wrong')}
          body={t('ui.we-could-not-complete-that-try-again')}
          reference={t('ui.reference')}
          copy={t('ui.copy-reference')}
          copied={t('impl.copied')}
          {...(opts.correlationId ? { correlationId: opts.correlationId } : {})}
          {...(opts.retryHref ? { retry: { label: t('ui.try-again'), href: opts.retryHref } } : {})}
        />
      );
  }
}

/** The state box for a failed or refused API call. */
export function stateOfFailure(
  locale: Locale,
  r: Extract<Loaded<unknown>, { ok: false }>,
  retryHref: string,
): ReactNode {
  return r.kind === 'denied'
    ? stateBox(locale, 'denied')
    : stateBox(locale, 'error', {
        retryHref,
        ...(r.correlationId ? { correlationId: r.correlationId } : {}),
      });
}

const itemsOf = (locale: Locale, defs: NavDef[], path: string): NavItem[] => {
  const t = getTranslator(locale);
  const current = currentPath(defs, path);
  return defs.map((d) => ({
    href: `/${locale}${d.path === '/' ? '' : d.path}`,
    label: t(d.label),
    icon: d.icon,
    ...(d.path === current ? { current: true } : {}),
  }));
};

/**
 * The frame of a signed-in page: navigation for the user's permissions, the tenant, role, language and environment pills,
 * the page title, and the page itself, or a state box when it is not populated. It loads `/v1/me` itself unless the page
 * already has it. With no session the user is sent to sign in; a failure to load `/v1/me` shows as the page's error state.
 */
export async function ShellPage({
  app,
  ctx,
  title,
  state = 'populated',
  me,
  headActions,
  children,
}: {
  app: AppId;
  ctx: PageCtx;
  title: string;
  state?: PageState;
  me?: Me;
  headActions?: ReactNode;
  children?: ReactNode;
}) {
  const { locale, path } = ctx;
  const t = getTranslator(locale);
  const loaded: Loaded<Me> = me ? { ok: true, data: me } : await loadMe(ctx);

  const permissions = loaded.ok ? loaded.data.permissions : [];
  const nav = itemsOf(locale, visibleNav(app, permissions), path);
  const tabs =
    app === 'consumer'
      ? itemsOf(locale, CONSUMER_TABS, path).map((x, i) => ({
          ...x,
          current: CONSUMER_TABS[i]!.path === path && i === (path === '/' ? 0 : 4),
        }))
      : undefined;

  const topbar = loaded.ok ? (
    <>
      <TenantBadge>
        {t('ui.tenant')}: {loaded.data.tenant.name}
      </TenantBadge>
      <RoleBadge>{roleLabel(locale, loaded.data.roles[0])}</RoleBadge>
      {loaded.data.elevation ? (
        <span className="pill" data-testid="elevation-badge">
          {t('impl.elevation.badge')}
        </span>
      ) : null}
      <span className="sp" />
      <LanguagePill href={`/${locale}/settings/language`}>{LANGUAGE_NAME[locale]}</LanguagePill>
      <EnvBadge />
    </>
  ) : (
    <>
      <span className="sp" />
      <LanguagePill href={`/${locale}/settings/language`}>{LANGUAGE_NAME[locale]}</LanguagePill>
      <EnvBadge />
    </>
  );

  let content: ReactNode;
  if (!loaded.ok) content = stateOfFailure(locale, loaded, `/${locale}${path === '/' ? '' : path}`);
  else if (state === 'populated') content = children;
  else
    content = stateBox(locale, state, {
      correlationId: 'COR-00000000-demo-state',
      retryHref: `/${locale}${path === '/' ? '' : path}`,
    });

  return (
    <AppShell
      brand={t('ui.pdfe-demo')}
      navLabel={t('ui.primary')}
      nav={nav}
      simulated={t('sim.simulated')}
      topbar={topbar}
      {...(tabs ? { tabs, tabsLabel: t('ui.main') } : {})}
    >
      <PageHead title={title} {...(headActions ? { actions: headActions } : {})} />
      {content}
    </AppShell>
  );
}

/** The frame of a page for someone who is not signed in (sign-in, the error page): the same frame, no personal parts. */
export function PublicPage({
  app,
  ctx,
  title,
  children,
}: {
  app: AppId;
  ctx: PageCtx;
  title: string;
  children: ReactNode;
}) {
  const { locale, path } = ctx;
  const t = getTranslator(locale);
  const nav = itemsOf(
    locale,
    visibleNav(app, []).filter((n) => !n.permission),
    path,
  );
  const tabs = app === 'consumer' ? itemsOf(locale, CONSUMER_TABS, path) : undefined;
  return (
    <AppShell
      brand={t('ui.pdfe-demo')}
      navLabel={t('ui.primary')}
      nav={nav}
      simulated={t('sim.simulated')}
      topbar={
        <>
          <span className="sp" />
          <LanguagePill href={`/${locale}/settings/language`}>{LANGUAGE_NAME[locale]}</LanguagePill>
          <EnvBadge />
        </>
      }
      {...(tabs ? { tabs, tabsLabel: t('ui.main') } : {})}
    >
      <PageHead title={title} />
      {children}
    </AppShell>
  );
}

/**
 * A page of a signed-in app: loads the user once, hands them to `render`, and puts the result in the frame. `render` returns
 * the page's content (it may call the API and return `stateOfFailure(...)` for a call that failed). When the user cannot be
 * loaded the frame shows the failure and `render` is not called. A `?state=` of anything but populated (DEMO) shows that
 * state's box instead of calling `render`, so the review of a state never depends on the API.
 */
export async function Screen({
  app,
  ctx,
  title,
  state = 'populated',
  headActions,
  render,
}: {
  app: AppId;
  ctx: PageCtx;
  title: string;
  state?: PageState;
  headActions?: ReactNode;
  render: (me: Me) => Promise<ReactNode> | ReactNode;
}) {
  const meResult = await loadMe(ctx);
  const me = meResult.ok ? meResult.data : undefined;
  const content = me && state === 'populated' ? await render(me) : undefined;
  return (
    <ShellPage
      app={app}
      ctx={ctx}
      title={title}
      state={state}
      {...(me ? { me } : {})}
      {...(headActions ? { headActions } : {})}
    >
      {content}
    </ShellPage>
  );
}
