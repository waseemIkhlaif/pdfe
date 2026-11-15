import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { SimulationBanner } from '@pdfe/ui-web';
import '@pdfe/design-tokens/dist/web/tokens.css';

const LOCALES = ['ar', 'en'] as const;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Root layout. The banner is rendered here, outside {children}, so no page can remove it.
 * Direction follows the locale: Arabic is right-to-left.
 */
export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(LOCALES as readonly string[]).includes(locale)) notFound();
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body
        style={{
          margin: 0,
          fontFamily:
            'var(--pdfe-font-family-latin), var(--pdfe-font-family-arabic), system-ui, sans-serif',
        }}
      >
        <SimulationBanner />
        {children}
      </body>
    </html>
  );
}
