import type { MessageKey } from '@pdfe/i18n';
import type { IconName } from '@pdfe/ui-web';

export type AppId = 'consumer' | 'merchant' | 'business' | 'console' | 'investor' | 'devportal';

export interface NavDef {
  /** Path inside the locale segment: `/admin/users`. */
  path: string;
  label: MessageKey;
  icon: IconName;
  /** The permission the API requires for what the page shows. Without it the item is shown to everyone signed in. */
  permission?: string;
}

const home: NavDef = { path: '/', label: 'ui.home', icon: 'home' };
const language: NavDef = { path: '/settings/language', label: 'ui.language', icon: 'info' };

/**
 * The side navigation of each app (contracts/ui-shell.md). Only places that exist in Phase 2 are listed: the prototype's
 * navigation also names screens of later phases, which are not built yet. The console filters its list by the permissions of
 * the signed-in user (`/v1/me`), so each demo role sees its own places.
 */
export const NAV: Record<AppId, NavDef[]> = {
  consumer: [home, language],
  merchant: [home, language],
  business: [home, language],
  investor: [home, language],
  devportal: [home, language],
  console: [
    home,
    {
      path: '/approvals',
      label: 'ui.approvals',
      icon: 'check-circle',
      permission: 'approvals.read',
    },
    { path: '/admin/users', label: 'screen.adm-001.title', icon: 'user', permission: 'iam.read' },
    { path: '/admin/roles', label: 'screen.adm-002.title', icon: 'lock', permission: 'iam.read' },
    { path: '/admin/tenants', label: 'screen.adm-008.title', icon: 'user', permission: 'iam.read' },
    { path: '/admin/config', label: 'ui.configuration', icon: 'info', permission: 'config.read' },
    {
      path: '/admin/config/features.flags',
      label: 'screen.adm-007.title',
      icon: 'info',
      permission: 'config.read',
    },
    {
      path: '/admin/scenarios',
      label: 'ui.scenarios',
      icon: 'chart',
      permission: 'demo.scenario.run',
    },
    {
      path: '/audit',
      label: 'screen.cmp-011.title',
      icon: 'search-check',
      permission: 'audit.read',
    },
    {
      path: '/audit/verify',
      label: 'screen.cmp-012.title',
      icon: 'check-circle',
      permission: 'audit.verify',
    },
    {
      path: '/audit/export',
      label: 'screen.cmp-013.title',
      icon: 'inbox',
      permission: 'audit.export',
    },
    {
      path: '/elevation',
      label: 'impl.elevation.title',
      icon: 'lock',
      permission: 'tenant.elevate',
    },
    language,
  ],
};

/** The bottom tabs of the consumer app (Home, Pay/Scan, Send, Markets, Profile). Phase 2 has only the shell. */
export const CONSUMER_TABS: NavDef[] = [
  { path: '/', label: 'ui.home', icon: 'home' },
  { path: '/', label: 'ui.pay-scan', icon: 'scan' },
  { path: '/', label: 'money.send', icon: 'send' },
  { path: '/', label: 'ui.markets', icon: 'chart' },
  { path: '/settings/language', label: 'ui.profile', icon: 'user' },
];

/** The items this user may see: those with no permission, and those whose permission they hold. */
export function visibleNav(app: AppId, permissions: readonly string[]): NavDef[] {
  const held = new Set(permissions);
  return NAV[app].filter((n) => !n.permission || held.has(n.permission));
}

/** Which item is the current page: the longest path that is the page's path or a parent of it. */
export function currentPath(items: readonly NavDef[], path: string): string | undefined {
  const norm = (p: string) => (p.length > 1 ? p.replace(/\/$/, '') : p);
  const here = norm(path);
  const hits = items
    .map((i) => norm(i.path))
    .filter((p) => p === here || (p !== '/' && here.startsWith(`${p}/`)));
  return hits.sort((a, b) => b.length - a.length)[0];
}
