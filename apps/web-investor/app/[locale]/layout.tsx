import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { SimShell } from '@pdfe/ui-web';
import '@pdfe/design-tokens/dist/web/tokens.css';
import '@pdfe/ui-web/styles.css';

const LOCALES = ['ar', 'en'] as const;
type Locale = (typeof LOCALES)[number];
const isLocale = (v: string): v is Locale => (LOCALES as readonly string[]).includes(v);

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

/**
 * Root layout. SimShell renders the simulation banner outside {children}, so no page can remove it, and sets the
 * direction from the locale (Arabic is right-to-left). This is the only file in an app that may import it.
 */
export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <SimShell locale={locale}>{children}</SimShell>;
}
