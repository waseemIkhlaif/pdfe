import { describe, expect, it } from 'vitest';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';
import {
  bannerText,
  getLanguage,
  languageFromUrl,
  parseLanguage,
  setLanguage,
  subscribeLanguage,
} from '../src/language';

describe('bannerText', () => {
  it('is exactly the label of the language, from the single source', () => {
    expect(bannerText('en')).toBe(SIM_LABEL_EN);
    expect(bannerText('ar')).toBe(SIM_LABEL_AR);
  });
});

describe('languageFromUrl', () => {
  it.each([
    ['pdfe://?lang=en', 'en'],
    ['pdfe://?lang=ar', 'ar'],
    ['pdfe://markets?x=1&lang=en', 'en'],
    ['pdfe://pay?lang=ar#top', 'ar'],
  ])('%s is %s', (url, lang) => expect(languageFromUrl(url)).toBe(lang));

  it.each([
    null,
    undefined,
    '',
    'pdfe://',
    'pdfe://?lang=fr',
    'pdfe://?lang=',
    'pdfe://?language=en',
    'pdfe://?lang=EN',
  ])('%s is not a language', (url) =>
    expect(languageFromUrl(url as string | null | undefined)).toBeNull(),
  );

  it('parseLanguage accepts only ar and en', () => {
    expect(parseLanguage('ar')).toBe('ar');
    expect(parseLanguage('xx')).toBeNull();
    expect(parseLanguage(undefined)).toBeNull();
  });
});

describe('the language store', () => {
  it('starts in Arabic, the primary language', () => {
    expect(getLanguage()).toBe('ar');
  });

  it('notifies subscribers once per change, and not for a repeat', () => {
    let calls = 0;
    const off = subscribeLanguage(() => (calls += 1));
    setLanguage('en');
    setLanguage('en');
    setLanguage('ar');
    off();
    setLanguage('en');
    expect(calls).toBe(2);
    expect(getLanguage()).toBe('en');
    setLanguage('ar');
  });
});
