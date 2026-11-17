import i18next from 'i18next';
import { DEFAULT_LOCALE, catalogs, isLocale, type Locale, type MessageKey } from './index';

export { DEFAULT_LOCALE, isLocale, type Locale, type MessageKey };

/**
 * i18next for the mobile app: the generated catalogs as resources, `{name}` arguments (the deck's syntax, not i18next's
 * `{{name}}`), keys separated by dots. One instance per call, so a test or a language switch never shares state.
 */
export async function createNativeI18n(locale: Locale = DEFAULT_LOCALE) {
  const instance = i18next.createInstance();
  await instance.init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    resources: { ar: { translation: catalogs.ar }, en: { translation: catalogs.en } },
    interpolation: { prefix: '{', suffix: '}', escapeValue: false },
    keySeparator: '.',
    returnNull: false,
    initAsync: false,
  });
  return {
    locale,
    t: (key: MessageKey, values?: Record<string, string | number>): string =>
      instance.t(key, values) as string,
    changeLanguage: (next: Locale) => instance.changeLanguage(next),
  };
}
