import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';

export type AppLanguage = 'ar' | 'en';

/** The label in a language: exactly `SIM_LABEL_EN` or `SIM_LABEL_AR`, from the single source. */
export const bannerText = (lang: AppLanguage): string =>
  lang === 'ar' ? SIM_LABEL_AR : SIM_LABEL_EN;

/** `ar` or `en` from a value such as a deep-link parameter; anything else is not a language. */
export const parseLanguage = (value: unknown): AppLanguage | null =>
  value === 'ar' || value === 'en' ? value : null;

let current: AppLanguage = 'ar'; // Arabic is the primary language, as on the web
const listeners = new Set<() => void>();

export const getLanguage = (): AppLanguage => current;

export function setLanguage(lang: AppLanguage): void {
  if (lang === current) return;
  current = lang;
  for (const l of listeners) l();
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The `lang` query parameter of a deep link, if it names a language: `pdfe://?lang=en`. */
export function languageFromUrl(url: string | null | undefined): AppLanguage | null {
  if (!url) return null;
  const q = url.split('?')[1]?.split('#')[0];
  if (!q) return null;
  for (const pair of q.split('&')) {
    const [k, v] = pair.split('=');
    if (k === 'lang') return parseLanguage(v);
  }
  return null;
}
