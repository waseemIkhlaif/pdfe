import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { SimBadge } from './badges';

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  current?: boolean;
}

/** The side navigation of a wide frame: the brand, then one link per place the signed-in role can go. */
export function SideNav({
  brand,
  label,
  items,
}: {
  brand: string;
  label: string;
  items: NavItem[];
}) {
  return (
    <aside className="sidenav" aria-label={label}>
      <h2>{brand}</h2>
      {items.map((n) => (
        <a key={n.href} href={n.href} {...(n.current ? { 'aria-current': 'page' as const } : {})}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </a>
      ))}
    </aside>
  );
}

/** The bottom tabs of a narrow frame (consumer app). */
export function TabBar({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <nav className="tabbar" aria-label={label}>
      {items.map((n) => (
        <a key={n.href} href={n.href} {...(n.current ? { 'aria-current': 'page' as const } : {})}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </a>
      ))}
    </nav>
  );
}

/**
 * The frame of every signed-in page: side navigation and top bar on a wide frame (tenant, role, language, environment), a
 * brand header with the SIMULATED badge on a narrow one, the page, and optionally bottom tabs. The two layouts are one
 * markup: the stylesheet shows one or the other by the width of the frame (a container query), so Arabic and English, phone
 * and desktop share it. `topbar` holds the pills, already built by the caller from the signed-in user.
 */
export function AppShell({
  brand,
  navLabel,
  nav,
  topbar,
  simulated,
  tabs,
  tabsLabel,
  children,
}: {
  brand: string;
  navLabel: string;
  nav: NavItem[];
  topbar: ReactNode;
  /** The word of the SIMULATED badge in the mobile header. */
  simulated: string;
  tabs?: NavItem[];
  tabsLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <SideNav brand={brand} label={navLabel} items={nav} />
      <div className="main">
        <header className="topbar">{topbar}</header>
        <header className="mhead">
          <strong>{brand}</strong>
          <span className="sp" />
          <SimBadge>{simulated}</SimBadge>
        </header>
        <main className="content" id="main">
          {children}
        </main>
        {tabs && tabsLabel ? <TabBar label={tabsLabel} items={tabs} /> : null}
      </div>
    </div>
  );
}
