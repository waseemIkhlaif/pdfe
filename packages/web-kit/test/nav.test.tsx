import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_ROLES } from '../src/roles';
import { CONSUMER_TABS, NAV, currentPath, visibleNav } from '../src/nav';
import { pageStateOf } from '../src/state';
import { roleLabel } from '../src/labels';

// Which places each demo role sees, which one is current, and which state a page is in (contracts/ui-shell.md).
afterEach(() => vi.unstubAllEnvs());

const paths = (app: Parameters<typeof visibleNav>[0], permissions: string[]) =>
  visibleNav(app, permissions).map((n) => n.path);

describe('navigation by permission', () => {
  it('a console user sees only the places their permissions allow', () => {
    expect(paths('console', [])).toEqual(['/', '/settings/language']);
    expect(paths('console', ['audit.read', 'audit.verify'])).toEqual([
      '/',
      '/audit',
      '/audit/verify',
      '/settings/language',
    ]);
    const admin = paths('console', [
      'approvals.read',
      'iam.read',
      'config.read',
      'demo.scenario.run',
      'tenant.elevate',
    ]);
    expect(admin).toEqual(
      expect.arrayContaining([
        '/approvals',
        '/admin/users',
        '/admin/roles',
        '/admin/tenants',
        '/admin/config',
        '/admin/config/features.flags',
        '/admin/scenarios',
        '/elevation',
      ]),
    );
    expect(admin).not.toContain('/audit');
  });

  it('the other apps show the same two places to everyone signed in', () => {
    for (const app of ['consumer', 'merchant', 'business', 'investor', 'devportal'] as const) {
      expect(paths(app, [])).toEqual(['/', '/settings/language']);
    }
  });

  it('every navigation item has a label key and a known icon, and the consumer has the five tabs', () => {
    for (const items of Object.values(NAV)) {
      for (const n of items) {
        expect(n.label).toMatch(/^(ui|screen|money|sim|impl)\./);
        expect(n.icon).toBeTruthy();
      }
    }
    expect(CONSUMER_TABS).toHaveLength(5);
  });
});

describe('the current place', () => {
  const items = NAV.console;

  it('is the longest path that is the page or one of its parents', () => {
    expect(currentPath(items, '/')).toBe('/');
    expect(currentPath(items, '/admin/config')).toBe('/admin/config');
    expect(currentPath(items, '/admin/config/fees.default_minor')).toBe('/admin/config');
    expect(currentPath(items, '/admin/config/features.flags')).toBe('/admin/config/features.flags');
    expect(currentPath(items, '/approvals/abc')).toBe('/approvals');
    expect(currentPath(items, '/audit/verify')).toBe('/audit/verify');
    expect(currentPath(items, '/audit')).toBe('/audit');
  });

  it('is nothing for a page that is not in the navigation, and Home is not the parent of everything', () => {
    expect(currentPath(items, '/somewhere/else')).toBeUndefined();
    expect(currentPath(items, '/403')).toBeUndefined();
  });
});

describe('page states', () => {
  it('?state= selects one of the five states in DEMO and anything else is populated', () => {
    for (const s of ['populated', 'empty', 'loading', 'error', 'denied']) {
      expect(pageStateOf(s)).toBe(s);
    }
    expect(pageStateOf(undefined)).toBe('populated');
    expect(pageStateOf('nonsense')).toBe('populated');
    expect(pageStateOf(['denied', 'empty'])).toBe('denied');
  });

  it('is ignored outside DEMO', () => {
    vi.stubEnv('APP_MODE', 'LIVE');
    expect(pageStateOf('denied')).toBe('populated');
  });
});

describe('roles', () => {
  it('a role with an approved label shows it in the page language, others show their code', () => {
    expect(roleLabel('en', 'platform_admin')).toBe('Platform admin');
    expect(roleLabel('ar', 'platform_admin')).toBe('مسؤول المنصة');
    expect(roleLabel('en', 'issuer_operator')).toBe('issuer_operator');
    expect(roleLabel('en', undefined)).toBe('');
  });

  it('every app offers its demo users, with the realm usernames, and the console ones need a second factor', () => {
    for (const roles of Object.values(DEMO_ROLES)) {
      expect(roles.length).toBeGreaterThan(0);
      for (const r of roles) expect(r.username).toMatch(/^demo\.[a-z_.]+$/);
    }
    expect(DEMO_ROLES.console.every((r) => r.privileged)).toBe(true);
    expect(DEMO_ROLES.consumer.every((r) => !r.privileged)).toBe(true);
  });
});
