import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** The page title line: the heading, and the page's main actions at the end. */
export function PageHead({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <span className="sp" />
      {actions}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`card${className ? ` ${className}` : ''}`}>{children}</div>;
}

export function BlockTitle({ children }: { children: ReactNode }) {
  return <h2 className="block-title">{children}</h2>;
}

export type NoticeTone = 'info' | 'warn' | 'danger' | 'success' | 'sim';
const NOTICE_ICON: Record<NoticeTone, IconName> = {
  info: 'info',
  warn: 'alert',
  danger: 'alert',
  success: 'check-circle',
  sim: 'info',
};

/** A message inside the page. Danger notices are announced at once (`role="alert"`), the others politely. */
export function Notice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  return (
    <div className={`notice ${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon name={NOTICE_ICON[tone]} />
      <div>{children}</div>
    </div>
  );
}

/** Label and value pairs (`dl`): a record's details. */
export function KeyValue({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="kv">
      {rows.map((r) => (
        <div key={r.label} style={{ display: 'contents' }}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Sections of one page, as links; the current one is marked. */
export function Tabs({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; current?: boolean }[];
}) {
  return (
    <nav className="tabs" aria-label={label}>
      {items.map((t) => (
        <a key={t.href} href={t.href} {...(t.current ? { 'aria-current': 'true' as const } : {})}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}

/** Buttons and links that look like buttons, in a row. */
export function Actions({ children }: { children: ReactNode }) {
  return <div className="actions">{children}</div>;
}

export function LinkButton({
  href,
  children,
  tone,
}: {
  href: string;
  children: ReactNode;
  tone?: 'primary' | 'danger' | 'link';
}) {
  return (
    <a className={`btn${tone ? ` ${tone}` : ''}`} href={href}>
      {children}
    </a>
  );
}

export function Button({
  children,
  tone,
  disabled,
  type = 'submit',
  name,
  value,
}: {
  children: ReactNode;
  tone?: 'primary' | 'danger' | 'link';
  disabled?: boolean;
  type?: 'submit' | 'button';
  name?: string;
  value?: string;
}) {
  return (
    <button
      className={`btn${tone ? ` ${tone}` : ''}`}
      type={type}
      disabled={disabled}
      name={name}
      value={value}
    >
      {children}
    </button>
  );
}

/** A grid of cards (the shells' "where to go" blocks). */
export function CardGrid({
  title,
  items,
}: {
  title?: string;
  items: { href?: string; title: string; body: string }[];
}) {
  return (
    <section>
      {title ? <BlockTitle>{title}</BlockTitle> : null}
      <div className="grid">
        {items.map((i) => (
          <div className="card" key={i.title}>
            {i.href ? (
              <a href={i.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{i.title}</strong>
                <div className="muted">{i.body}</div>
              </a>
            ) : (
              <>
                <strong>{i.title}</strong>
                <div className="muted">{i.body}</div>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
