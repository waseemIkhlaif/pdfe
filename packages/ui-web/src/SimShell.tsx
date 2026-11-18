import type { CSSProperties, ReactNode } from 'react';
import { Z_BANNER, Z_PORTAL } from './layers';
import { SimulationBanner } from './SimulationBanner';

export type ShellLocale = 'ar' | 'en';

const bodyStyle: CSSProperties = {
  margin: 0,
  fontFamily:
    'var(--pdfe-font-family-latin), var(--pdfe-font-family-arabic), system-ui, sans-serif',
};

/**
 * The root layout wrapper of every web app. The banner comes first, outside the page content and outside the
 * portal container, so nothing a page renders can remove it, and anything a page opens (Radix mounts dialogs and
 * menus into `#pdfe-portal-root`) sits below it. Direction follows the language: Arabic is right to left.
 * Only the root layout may use this; page code is barred from importing it (lint rule).
 */
export function SimShell({ locale, children }: { locale: ShellLocale; children: ReactNode }) {
  const layers = {
    '--pdfe-z-banner': Z_BANNER,
    '--pdfe-z-portal': Z_PORTAL,
  } as CSSProperties;
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} style={layers}>
      <body style={bodyStyle}>
        <SimulationBanner />
        <div id="pdfe-content" className="frame">
          {children}
        </div>
        <div id="pdfe-portal-root" style={{ position: 'relative', zIndex: Z_PORTAL }} />
      </body>
    </html>
  );
}
