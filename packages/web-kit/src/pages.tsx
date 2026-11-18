import { notFound } from 'next/navigation';
import { getTranslator, isLocale, type Locale, type MessageKey } from '@pdfe/i18n/next';
import {
  Card,
  CardGrid,
  ErrorView,
  KeyValue,
  LanguageSwitch,
  Notice,
  RolePicker,
  SimBadge,
  errorText,
} from '@pdfe/ui-web';
import type { PageCtx } from './api';
import { callApi, loadMe, type Me } from './api';
import { visibleNav, type AppId } from './nav';
import { DEMO_ROLES } from './roles';
import { PublicPage, ShellPage, pageStateOf, roleLabel, stateBox } from './shell';

type Params = Promise<{ locale: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
export interface PageProps {
  params: Params;
  searchParams?: SearchParams;
}

/** The locale of the URL segment, or the 404 of the app. */
export async function localeOf(params: Params): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

// --- home shells ----------------------------------------------------------------------------------------------------

interface HomeCard {
  title: MessageKey;
  body?: MessageKey;
  path?: string;
}

/** What each portal's home says: its heading, the cards under it (the approved "App shell" screens, MER-001 and the rest). */
const HOME: Partial<
  Record<AppId, { screen: MessageKey; heading: MessageKey; cards: HomeCard[]; notice?: MessageKey }>
> = {
  merchant: {
    screen: 'screen.mer-001.title',
    heading: 'ui.welcome-to-the-merchant-portal',
    cards: [
      { title: 'ui.dashboard', body: 'ui.sales-and-the-next-settlement' },
      { title: 'money.payments', body: 'money.all-payments' },
      { title: 'ui.settlements', body: 'money.batches-and-payouts' },
    ],
  },
  business: {
    screen: 'screen.biz-001.title',
    heading: 'ui.welcome-to-the-business-portal',
    cards: [
      { title: 'ui.dashboard', body: 'ui.receivables-and-payables' },
      { title: 'ui.invoices', body: 'ui.create-and-track' },
      { title: 'ui.approvals', body: 'money.payout-approvals' },
    ],
  },
  investor: {
    screen: 'screen.inv-001.title',
    heading: 'ui.investor-demo-dashboard',
    notice: 'sim.this-dashboard-shows-modeled-simulated-f',
    cards: [{ title: 'ui.guided-scenarios' }, { title: 'ui.kpis' }, { title: 'ui.controls' }],
  },
  devportal: {
    screen: 'screen.dev-001.title',
    heading: 'ui.developer-portal',
    cards: [
      { title: 'ui.getting-started' },
      { title: 'ui.api-reference' },
      { title: 'ui.sandbox' },
    ],
  },
};

/** The console's home is routed by role: the screen, the heading and the places that role can reach. */
function consoleHome(me: Me | undefined): {
  screen: MessageKey;
  heading: MessageKey;
  notice?: MessageKey;
} {
  const roles = me?.roles ?? [];
  if (roles.some((r) => r.startsWith('compliance') || r === 'auditor')) {
    return {
      screen: 'screen.cmp-001.title',
      heading: 'sim.compliance-console',
      notice: 'sim.synthetic-screening-this-is-not-a-real-c',
    };
  }
  if (roles.some((r) => r.startsWith('finance'))) {
    return { screen: 'screen.fin-001.title', heading: 'ui.finance-and-treasury-console' };
  }
  return { screen: 'screen.ops-001.title', heading: 'ui.operations-console' };
}

/** `/[locale]`: the shell of the app, in whatever state `?state=` asks for (DEMO) or the real one. */
export async function HomePage({ app, params, searchParams }: PageProps & { app: AppId }) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const ctx: PageCtx = { locale, path: '/' };
  const t = getTranslator(locale);
  const state = pageStateOf(sp.state);
  const meResult = await loadMe(ctx);
  const me = meResult.ok ? meResult.data : undefined;

  let title: string;
  let body: React.ReactNode;
  if (app === 'consumer') {
    title = t('screen.con-008.title');
    body = (
      <>
        <Card className="kpi">
          <span className="muted">{t('ui.signed-in-as')}</span>
          <span className="v" style={{ fontSize: 32, fontWeight: 700 }}>
            {roleLabel(locale, me?.roles[0])}
          </span>
          <span className="f">{t('ui.use-the-tabs-or-the-side-menu-to-move-ar')}</span>
          <span>
            <SimBadge>{t('sim.simulated')}</SimBadge>
          </span>
        </Card>
        <CardGrid
          title={t('ui.where-to-go')}
          items={[
            { title: t('ui.home'), body: t('money.balances-and-quick-actions') },
            { title: t('ui.pay-scan'), body: t('ui.scan-a-qr-code') },
            { title: t('money.send'), body: t('money.send-money') },
            { title: t('ui.markets'), body: t('ui.paper-trading') },
          ]}
        />
      </>
    );
  } else if (app === 'console') {
    const c = consoleHome(me);
    title = t(c.screen);
    const places = visibleNav('console', me?.permissions ?? []).filter(
      (n) => n.path !== '/' && n.path !== '/settings/language',
    );
    body = (
      <>
        {c.notice ? <Notice tone="sim">{t(c.notice)}</Notice> : null}
        <CardGrid
          title={t(c.heading)}
          items={places.map((n) => ({ href: `/${locale}${n.path}`, title: t(n.label), body: '' }))}
        />
      </>
    );
  } else {
    const h = HOME[app]!;
    title = t(h.screen);
    body = (
      <>
        {h.notice ? <Notice tone="sim">{t(h.notice)}</Notice> : null}
        <CardGrid
          title={t(h.heading)}
          items={h.cards.map((c) => ({ title: t(c.title), body: c.body ? t(c.body) : '' }))}
        />
      </>
    );
  }

  return (
    <ShellPage app={app} ctx={ctx} title={title} state={state} {...(me ? { me } : {})}>
      <div data-testid="home" style={{ display: 'contents' }}>
        {body}
      </div>
    </ShellPage>
  );
}

// --- sign-in: the demo role picker ------------------------------------------------------------------------------------

/** `/[locale]/sign-in`: choose a demo role; the choice starts the hosted sign-in with that user (`login_hint`). */
export async function SignInPage({ app, params, searchParams }: PageProps & { app: AppId }) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const returnTo = first(sp.returnTo);
  const target =
    returnTo && returnTo.startsWith(`/${locale}`) && !returnTo.startsWith('//')
      ? returnTo
      : `/${locale}`;
  const roles = DEMO_ROLES[app];
  return (
    <PublicPage app={app} ctx={{ locale, path: '/sign-in' }} title={t('screen.con-004.title')}>
      <main data-testid="sign-in" style={{ display: 'contents' }}>
        <Notice tone="sim">{t('sim.you-are-choosing-a-role-inside-a-simulat')}</Notice>
        <RolePicker
          heading={t('ui.choose-a-demo-role')}
          roles={roles.map((r) => ({
            username: r.username,
            title: t(r.title),
            body: r.body ? t(r.body) : r.privileged ? t('ui.mfa') : '',
          }))}
          signInHref={(u) =>
            `/api/auth/sign-in?returnTo=${encodeURIComponent(target)}&login_hint=${encodeURIComponent(u)}`
          }
        />
        <a
          className="btn primary"
          data-testid="sign-in-link"
          href={`/api/auth/sign-in?returnTo=${encodeURIComponent(target)}`}
          style={{ alignSelf: 'flex-start' }}
        >
          {t('ui.sign-in')}
        </a>
        <Notice tone="info">{t('ui.demo-accounts-only-no-real-accounts-exis')}</Notice>
      </main>
    </PublicPage>
  );
}

// --- settings: language ---------------------------------------------------------------------------------------------

/** `/[locale]/settings/language` (CON-005): the language is in the URL, so choosing is following a link. */
export async function LanguageSettingsPage({
  app,
  params,
  searchParams,
}: PageProps & { app: AppId }) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  const ctx: PageCtx = { locale, path: '/settings/language' };
  const state = pageStateOf(sp.state);
  const other = (l: Locale) => `/${l}/settings/language`;
  return (
    <ShellPage app={app} ctx={ctx} title={t('screen.con-005.title')} state={state}>
      <LanguageSwitch
        label={t('ui.language')}
        options={[
          { locale: 'ar', label: 'العربية', href: other('ar'), current: locale === 'ar' },
          { locale: 'en', label: t('ui.english'), href: other('en'), current: locale === 'en' },
        ]}
      />
      <Card>
        <KeyValue
          rows={[
            {
              label: t('ui.digits'),
              value: <bdi className="ltr">{t('ui.western-0-9')}</bdi>,
            },
          ]}
        />
        <p className="muted">{t('money.western-digits-are-the-default-for-amoun')}</p>
      </Card>
    </ShellPage>
  );
}

// --- 403 and error ----------------------------------------------------------------------------------------------------

/** `/[locale]/403`: where a page sends someone who is signed in but may not see it. */
export async function ForbiddenPage({ app, params }: PageProps & { app: AppId }) {
  const locale = await localeOf(params);
  const t = getTranslator(locale);
  return (
    <PublicPage app={app} ctx={{ locale, path: '/403' }} title={t('screen.con-007.title')}>
      <div data-testid="forbidden" style={{ display: 'contents' }}>
        {stateBox(locale, 'denied', { backHref: `/${locale}` })}
      </div>
    </PublicPage>
  );
}

const CID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * `/[locale]/error`: the failed request's correlation ID with a button to copy it (SC-012). With `?simulate=500` (DEMO) it
 * asks the API for a failure to look at.
 */
export async function ErrorPage({ app, params, searchParams }: PageProps & { app: AppId }) {
  const locale = await localeOf(params);
  const sp = (await searchParams) ?? {};
  const t = getTranslator(locale);
  let correlationId = CID.test(first(sp.cid) ?? '') ? first(sp.cid) : undefined;
  let messageKey = /^errors\.[a-z_]+$/.test(first(sp.key) ?? '')
    ? first(sp.key)!
    : 'errors.internal';

  if (first(sp.simulate) === '500') {
    const res = await callApi<unknown>({ locale, path: '/error' }, '/v1/demo/simulate-error', {
      method: 'POST',
    });
    if (!res.ok && res.kind === 'error') {
      correlationId = res.correlationId;
      messageKey = res.messageKey;
    }
  }
  return (
    <PublicPage app={app} ctx={{ locale, path: '/error' }} title={t('ui.something-went-wrong')}>
      <div data-testid="error-page" style={{ display: 'contents' }}>
        <ErrorView
          text={errorText(locale, messageKey)}
          {...(correlationId ? { correlationId } : {})}
          retryHref={`/${locale}`}
          retryLabel={t('ui.try-again')}
        />
      </div>
    </PublicPage>
  );
}
