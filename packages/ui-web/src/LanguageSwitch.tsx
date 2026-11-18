export interface LanguageOption {
  locale: 'ar' | 'en';
  /** The language's own name: `العربية`, `English`. */
  label: string;
  href: string;
  current: boolean;
}

/**
 * Chooses the language (CON-005). Each option is a link to the same page in the other language: the language is part of
 * the URL (`/ar/...`, `/en/...`), so the choice survives a reload, a shared link and a restart, and the page's `<html lang>`
 * and `dir` change with it. The option in use is marked `aria-current`.
 */
export function LanguageSwitch({ label, options }: { label: string; options: LanguageOption[] }) {
  return (
    <nav aria-label={label} data-testid="language-switch">
      <div className="grid">
        {options.map((o) => (
          <a
            key={o.locale}
            className="card"
            href={o.href}
            lang={o.locale}
            hrefLang={o.locale}
            {...(o.current ? { 'aria-current': 'true' as const } : {})}
            style={{
              textDecoration: 'none',
              color: 'inherit',
              ...(o.current
                ? { borderColor: 'var(--pdfe-color-brand-primary)', borderWidth: 2 }
                : {}),
            }}
          >
            <strong>{o.label}</strong>
          </a>
        ))}
      </div>
    </nav>
  );
}
