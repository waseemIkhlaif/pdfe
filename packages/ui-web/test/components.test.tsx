import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Actions,
  BlockTitle,
  Button,
  Card,
  CardGrid,
  EnvBadge,
  Icon,
  ICON_NAMES,
  KeyValue,
  LanguagePill,
  LinkButton,
  Ltr,
  MoneyText,
  Notice,
  PageHead,
  RoleBadge,
  SimBadge,
  StatusChip,
  STATUSES,
  Tabs,
  TenantBadge,
  formatMinor,
} from '../src';

afterEach(cleanup);

describe('Icon', () => {
  it('is decorative and draws on the 16 grid; every name has a drawing', () => {
    const { container } = render(<Icon name="home" className="x" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(svg.getAttribute('class')).toBe('i x');
    for (const name of ICON_NAMES) {
      const r = render(<Icon name={name} />);
      expect(r.container.querySelector('svg')!.children.length, name).toBeGreaterThan(0);
      r.unmount();
    }
  });
});

describe('badges', () => {
  it('tenant, role, environment and language are labelled pills; the environment defaults to DEMO', () => {
    render(
      <>
        <TenantBadge>Tenant: Demo A</TenantBadge>
        <RoleBadge>Platform admin</RoleBadge>
        <EnvBadge />
        <LanguagePill href="/en/settings/language">EN · English</LanguagePill>
        <SimBadge>SIMULATED</SimBadge>
      </>,
    );
    expect(screen.getByTestId('tenant-badge').textContent).toBe('Tenant: Demo A');
    expect(screen.getByTestId('role-badge').textContent).toBe('Platform admin');
    expect(screen.getByTestId('env-badge').textContent).toBe('DEMO');
    expect(screen.getByTestId('env-badge').className).toContain('env');
    expect(screen.getByTestId('language-pill').getAttribute('href')).toBe('/en/settings/language');
    expect(screen.getByText('SIMULATED').className).toBe('badge-sim');
  });
});

describe('StatusChip', () => {
  it('shows a word and an icon for each of the eight statuses, never a colour alone', () => {
    expect(Object.keys(STATUSES)).toHaveLength(8);
    for (const status of Object.keys(STATUSES) as (keyof typeof STATUSES)[]) {
      const { container, unmount } = render(<StatusChip status={status} label={status} />);
      const chip = container.querySelector('.chip')!;
      expect(chip.querySelector('svg')).not.toBeNull();
      expect(chip.textContent).toBe(status);
      expect(chip.className).toMatch(/st-(success|warning|danger|info|neutral)/);
      unmount();
    }
    expect(STATUSES.completed.tone).toBe('success');
    expect(STATUSES.failed.tone).toBe('danger');
  });
});

describe('MoneyText', () => {
  it.each([
    [12050, 'ILS', '120.50 ILS'],
    [125000, 'ILS', '1,250.00 ILS'],
    [5, 'ILS', '0.05 ILS'],
    [0, 'USD', '0.00 USD'],
    [-1825, 'ILS', '-18.25 ILS'],
    [1_234_567_890, 'ILS', '12,345,678.90 ILS'],
    [1500, 'JOD', '1.500 JOD'],
    [123n * 10n ** 18n, 'ILS', '1,230,000,000,000,000,000.00 ILS'],
  ])('formats %s %s as %s with integer arithmetic', (minor, currency, expected) => {
    expect(formatMinor(minor, currency)).toBe(expected);
  });

  it('is a left-to-right <bdi> with Western digits, also in an Arabic sentence', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    render(
      <p lang="ar">
        المبلغ <MoneyText minor={12050} currency="ILS" /> و <Ltr>COR-0001</Ltr>
      </p>,
    );
    const money = document.querySelector('[data-money]')!;
    expect(money.tagName).toBe('BDI');
    expect(money.getAttribute('dir')).toBe('ltr');
    expect(money.textContent).toBe('120.50 ILS');
    expect(money.textContent).toMatch(/^[\d.,\sA-Z-]+$/);
    expect(screen.getByText('COR-0001').tagName).toBe('BDI');
    document.documentElement.removeAttribute('dir');
  });
});

describe('page blocks', () => {
  it('PageHead has the one h1, and the actions at the end', () => {
    render(<PageHead title="Config list" actions={<button>Do</button>} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Config list');
    expect(screen.getByRole('button', { name: 'Do' })).toBeTruthy();
  });

  it('Notice announces a danger at once and the others politely', () => {
    render(
      <>
        <Notice tone="danger">bad</Notice>
        <Notice tone="info">fyi</Notice>
        <Notice tone="sim">simulated</Notice>
      </>,
    );
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('KeyValue is a definition list; Card and BlockTitle wrap content', () => {
    const { container } = render(
      <Card>
        <BlockTitle>Details</BlockTitle>
        <KeyValue rows={[{ label: 'Key', value: <b>Value</b> }]} />
      </Card>,
    );
    expect(container.querySelector('dl.kv dt')!.textContent).toBe('Key');
    expect(container.querySelector('dl.kv dd b')!.textContent).toBe('Value');
    expect(container.querySelector('h2.block-title')!.textContent).toBe('Details');
  });

  it('Tabs mark the current section', () => {
    render(
      <Tabs
        label="Sections"
        items={[
          { href: '/a', label: 'History', current: true },
          { href: '/b', label: 'Diff' },
        ]}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Sections' })).toBeTruthy();
    expect(screen.getByText('History').getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('Diff').getAttribute('aria-current')).toBeNull();
  });

  it('buttons: tones, disabled and link buttons', () => {
    render(
      <Actions>
        <Button tone="primary">Go</Button>
        <Button tone="danger" disabled>
          Stop
        </Button>
        <LinkButton href="/x" tone="link">
          More
        </LinkButton>
      </Actions>,
    );
    expect(screen.getByRole('button', { name: 'Go' }).className).toBe('btn primary');
    expect((screen.getByRole('button', { name: 'Stop' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('link', { name: 'More' }).getAttribute('href')).toBe('/x');
  });

  it('CardGrid links the cards that have a target', () => {
    render(
      <CardGrid
        title="Where to go"
        items={[
          { href: '/home', title: 'Home', body: 'Balances' },
          { title: 'Info', body: 'Plain' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Home/ }).getAttribute('href')).toBe('/home');
    expect(screen.queryByRole('link', { name: /Info/ })).toBeNull();
  });
});
