import { cleanup, render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AppShell,
  EnvBadge,
  LanguageSwitch,
  MakerCheckerPanel,
  RoleBadge,
  RolePicker,
  SimShell,
  TabBar,
  TenantBadge,
} from '../src';

afterEach(cleanup);

const nav = [
  { href: '/en', label: 'Home', icon: 'home' as const, current: true },
  { href: '/en/audit', label: 'Audit search', icon: 'lock' as const },
];

describe('AppShell', () => {
  const shell = (extra: object = {}) => (
    <AppShell
      brand="PDFE Demo"
      navLabel="Primary"
      nav={nav}
      simulated="SIMULATED"
      topbar={
        <>
          <TenantBadge>Tenant: Demo A</TenantBadge>
          <RoleBadge>Platform admin</RoleBadge>
          <EnvBadge />
        </>
      }
      {...extra}
    >
      <h1>Page</h1>
    </AppShell>
  );

  it('has the side navigation, the top bar with the badges, the mobile header and one main landmark', () => {
    render(shell());
    expect(screen.getByRole('complementary', { name: 'Primary' })).toBeTruthy();
    const links = within(screen.getByRole('complementary')).getAllByRole('link');
    expect(links.map((l) => l.textContent)).toEqual(['Home', 'Audit search']);
    expect(links[0]!.getAttribute('aria-current')).toBe('page');
    expect(links[1]!.getAttribute('aria-current')).toBeNull();
    expect(screen.getByTestId('tenant-badge').textContent).toBe('Tenant: Demo A');
    expect(screen.getByTestId('role-badge').textContent).toBe('Platform admin');
    expect(screen.getByTestId('env-badge').textContent).toBe('DEMO');
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByText('SIMULATED')).toBeTruthy(); // the mobile header's badge
  });

  it('shows bottom tabs only when asked, labelled', () => {
    const { rerender } = render(shell());
    expect(screen.queryByRole('navigation')).toBeNull();
    rerender(shell({ tabs: nav, tabsLabel: 'Main' }));
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeTruthy();
  });

  it('TabBar marks the current tab', () => {
    render(<TabBar label="Main" items={nav} />);
    expect(screen.getByText('Home').closest('a')!.getAttribute('aria-current')).toBe('page');
  });
});

describe('SimShell frame', () => {
  it('puts the page in the frame container, after the banner and before the portal root', () => {
    const html = renderToStaticMarkup(
      <SimShell locale="ar">
        <main />
      </SimShell>,
    );
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.documentElement.getAttribute('dir')).toBe('rtl');
    expect(doc.getElementById('pdfe-content')!.className).toBe('frame');
    expect([...doc.body.children].map((c) => c.getAttribute('data-sim') ?? c.id)).toEqual([
      '1',
      'pdfe-content',
      'pdfe-portal-root',
    ]);
  });
});

describe('MakerCheckerPanel', () => {
  const text = {
    title: 'Approval',
    requester: 'Requester',
    approver: 'Approver',
    reason: 'Reason',
    approve: 'Approve',
    reject: 'Reject',
    conflictTitle: 'Separation of duties',
    conflictBody: 'You cannot approve your own request.',
  };
  const panel = (selfRequested: boolean, decidable = true) => (
    <MakerCheckerPanel
      text={text}
      requester="Demo Admin A"
      approver="Demo Admin B"
      selfRequested={selfRequested}
      decidable={decidable}
      approveAction={vi.fn()}
      rejectAction={vi.fn()}
      hidden={{ id: 'abc' }}
    />
  );

  it('lets another person approve or reject, with a reason', () => {
    render(panel(false));
    expect((screen.getByTestId('approve') as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByTestId('reject') as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId('sod-notice')).toBeNull();
    expect((screen.getByLabelText('Reason') as HTMLTextAreaElement).required).toBe(true);
    expect(document.querySelector('input[name="id"]')!.getAttribute('value')).toBe('abc');
  });

  it('disables Approve for the requester and says why (the API refuses it too)', () => {
    render(panel(true));
    expect((screen.getByTestId('approve') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('sod-notice').textContent).toContain(
      'You cannot approve your own request.',
    );
    expect((screen.getByTestId('reject') as HTMLButtonElement).disabled).toBe(false);
  });

  it('shows no form once the request is decided', () => {
    render(panel(false, false));
    expect(screen.queryByTestId('approve')).toBeNull();
    expect(screen.getByText('Demo Admin A')).toBeTruthy();
  });
});

describe('LanguageSwitch', () => {
  it('links to the same page in each language and marks the one in use', () => {
    render(
      <LanguageSwitch
        label="Language"
        options={[
          { locale: 'ar', label: 'العربية', href: '/ar/x', current: false },
          { locale: 'en', label: 'English', href: '/en/x', current: true },
        ]}
      />,
    );
    const links = within(screen.getByRole('navigation', { name: 'Language' })).getAllByRole('link');
    expect(links.map((l) => [l.getAttribute('lang'), l.getAttribute('href')])).toEqual([
      ['ar', '/ar/x'],
      ['en', '/en/x'],
    ]);
    expect(links[1]!.getAttribute('aria-current')).toBe('true');
    expect(links[0]!.getAttribute('aria-current')).toBeNull();
  });
});

describe('RolePicker', () => {
  it('one link per demo role, each starting the sign-in as that user', () => {
    render(
      <RolePicker
        heading="Choose a demo role"
        roles={[
          { username: 'demo.individual', title: 'Individual', body: 'Wallet, payments' },
          { username: 'demo.merchant_owner', title: 'Merchant', body: 'Merchant mode' },
        ]}
        signInHref={(u) => `/api/auth/sign-in?login_hint=${encodeURIComponent(u)}`}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Choose a demo role' })).toBeTruthy();
    expect(screen.getByTestId('role-demo.individual').getAttribute('href')).toBe(
      '/api/auth/sign-in?login_hint=demo.individual',
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});
