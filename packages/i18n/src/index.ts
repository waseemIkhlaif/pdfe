import { IntlMessageFormat } from 'intl-messageformat';
import ar from './catalogs/ar.json';
import en from './catalogs/en.json';
import { MESSAGE_KEYS, type MessageKey } from './keys';

export { MESSAGE_KEYS, type MessageKey };

export const LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
/** Arabic is the default (the product is for Arabic first, FR-023); a request with no language gets it. */
export const DEFAULT_LOCALE: Locale = 'ar';

export const isLocale = (v: unknown): v is Locale => v === 'ar' || v === 'en';
export const directionOf = (locale: Locale): 'rtl' | 'ltr' => (locale === 'ar' ? 'rtl' : 'ltr');

export type Messages = { [key: string]: string | Messages };
export const catalogs: Record<Locale, Messages> = { ar, en };

const lookup = (messages: Messages, key: string): string | undefined => {
  let node: string | Messages | undefined = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
};

const formatters = new Map<string, IntlMessageFormat>();

/**
 * One message in one language, with its arguments filled in (`{ts}` in the deck's strings). The key is typed: a key that is
 * not in the approved copy deck does not compile. A key that is missing at run time (it cannot be, `generate` checks) gives
 * the key itself rather than nothing, so a gap is visible.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  values?: Record<string, string | number>,
): string {
  const text = lookup(catalogs[locale], key);
  if (text === undefined) return key;
  // With no arguments the text is returned as written: a placeholder such as {n} stays visible instead of throwing.
  return values ? format(locale, text, values) : text;
}

function format(locale: Locale, text: string, values: Record<string, string | number>): string {
  const id = `${locale}:${text}`;
  let f = formatters.get(id);
  if (!f) {
    f = new IntlMessageFormat(text, locale);
    formatters.set(id, f);
  }
  return String(f.format(values));
}

/** `t(key, values)` bound to a language. */
export const translator =
  (locale: Locale) =>
  (key: MessageKey, values?: Record<string, string | number>): string =>
    translate(locale, key, values);

export type Translator = ReturnType<typeof translator>;
