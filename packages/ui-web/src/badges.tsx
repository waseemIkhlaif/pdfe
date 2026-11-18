import type { ReactNode } from 'react';

/** Small labelled pills of the top bar and the mobile header. All text comes in already translated. */

/** SIMULATED: the badge of the mobile header and of simulated records. */
export function SimBadge({ children }: { children: ReactNode }) {
  return <span className="badge-sim">{children}</span>;
}

/** `Tenant: <name>`: whose data this is. */
export function TenantBadge({ children }: { children: ReactNode }) {
  return (
    <span className="pill" data-testid="tenant-badge">
      {children}
    </span>
  );
}

/** The demo role the signed-in user acts in. */
export function RoleBadge({ children }: { children: ReactNode }) {
  return (
    <span className="pill" data-testid="role-badge">
      {children}
    </span>
  );
}

/** DEMO: the environment. Only DEMO exists, and it says so on every screen. */
export function EnvBadge({ children = 'DEMO' }: { children?: ReactNode }) {
  return (
    <span className="pill env" data-testid="env-badge">
      {children}
    </span>
  );
}

/** The current language, as a link to the page where it can be changed. */
export function LanguagePill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="pill" href={href} data-testid="language-pill">
      {children}
    </a>
  );
}
