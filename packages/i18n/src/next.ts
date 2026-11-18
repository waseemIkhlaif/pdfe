import { createTranslator } from 'use-intl/core';
import { DEFAULT_LOCALE, LOCALES, catalogs, isLocale, type Locale, type MessageKey } from './index';

export { DEFAULT_LOCALE, LOCALES, isLocale, type Locale, type MessageKey };

/**
 * The setup for the Next.js apps: the same engine as next-intl (use-intl), fed with the generated catalogs. A server
 * component calls `getTranslator(locale)`; a client component receives `intlProps(locale)` for the provider. Nothing here
 * reads a request, so it works in pages, layouts and route handlers alike, and the language is always the one in the URL
 * segment (`/[locale]/...`).
 */
export function getTranslator(locale: Locale) {
  const t = createTranslator({ locale, messages: catalogs[locale] });
  // The key type of use-intl is the shape of the catalog; ours is the list of approved keys, which is what a caller has.
  return (key: MessageKey, values?: Record<string, string | number>): string =>
    (t as unknown as (k: string, v?: Record<string, string | number>) => string)(key, values);
}

/** `{ locale, messages }` for an `IntlProvider`, in the language of the page. */
export const intlProps = (locale: Locale) => ({ locale, messages: catalogs[locale] });

/** The `<html>` attributes for a language: `lang` and `dir`. */
export const htmlAttributes = (locale: Locale) => ({
  lang: locale,
  dir: locale === 'ar' ? ('rtl' as const) : ('ltr' as const),
});
