import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: the generator is a plain ES module script
import * as gen from '../scripts/generate.mjs';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';
import { catalogs, MESSAGE_KEYS, translate, translator } from '../src';
import { createNativeI18n } from '../src/native';
import { getTranslator } from '../src/next';

// The catalogs come from the approved rows of the copy deck and nothing else (T174).
const HEAD = `| Key | English | Arabic | Regulated | AR review | Native check | Legal | Status | Notes |
|---|---|---|---|---|---|---|---|---|
`;
const row = (key: string, en: string, ar: string, status = 'approved') =>
  `| ${key} | ${en} | ${ar} | no | done | n/a | n/a | ${status} | note |\n`;
const files = (
  md: string,
  extras?: unknown,
  opts: { keycloak?: boolean } = {},
): Record<string, string> => gen.generateFiles(md, extras, opts);
const flat = (o: Record<string, unknown>, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flat(v as Record<string, unknown>, `${p}${k}.`)
      : [`${p}${k}`],
  );

describe('which rows are emitted', () => {
  it('only the approved ones', () => {
    const md =
      HEAD +
      row('ui.one', 'One', 'واحد') +
      row('ui.two', 'Two', 'اثنان', 'draft') +
      row('ui.three', 'Three', 'ثلاثة', 'in review');
    const out = files(md);
    const en = JSON.parse(out['catalogs/en.json']!);
    expect(en).toEqual({ ui: { one: 'One' } });
    expect(out['keys.ts']).toContain("'ui.one'");
    expect(out['keys.ts']).not.toContain('ui.two');
    expect(out['keys.ts']).not.toContain('ui.three');
  });

  it('refuses a deck with no approved row at all', () => {
    expect(() => files(HEAD + row('ui.one', 'One', 'واحد', 'draft'))).toThrow(/no approved rows/);
  });

  it('is sorted and stable: the same deck gives the same bytes', () => {
    const md = HEAD + row('ui.b', 'B', 'ب') + row('ui.a', 'A', 'أ');
    expect(files(md)).toEqual(files(md));
    expect(Object.keys(JSON.parse(files(md)['catalogs/en.json']!).ui)).toEqual(['a', 'b']);
  });
});

describe('every key exists in both languages', () => {
  it('a row with no Arabic or no English text stops the build', () => {
    expect(() => files(HEAD + row('ui.one', 'One', ''))).toThrow(/ui\.one: no ar text/);
    expect(() => files(HEAD + row('ui.one', '', 'واحد'))).toThrow(/ui\.one: no en text/);
  });

  it('the generated catalogs have exactly the same keys', () => {
    const real = files(readFileSync(gen.DECK, 'utf8'), gen.readExtras(), { keycloak: true });
    expect(flat(JSON.parse(real['catalogs/ar.json']!)).sort()).toEqual(
      flat(JSON.parse(real['catalogs/en.json']!)).sort(),
    );
  });

  it('a key cannot be a message and a group at once, nor be listed twice, nor be malformed', () => {
    expect(() => files(HEAD + row('ui.a', 'A', 'أ') + row('ui.a.b', 'AB', 'أب'))).toThrow(
      /prefix of ui\.a\.b/,
    );
    expect(() => files(HEAD + row('ui.a', 'A', 'أ') + row('ui.a', 'A2', 'أ2'))).toThrow(
      /listed twice/,
    );
    expect(() => files(HEAD + row('Bad Key', 'A', 'أ'))).toThrow(/not a valid key/);
  });
});

describe('the ICU syntax parses', () => {
  it('arguments, plurals and selects are accepted', () => {
    const md =
      HEAD +
      row('ui.at', 'At {ts}', 'في {ts}') +
      row('ui.n', '{n, plural, one {# item} other {# items}}', '{n, plural, other {# عناصر}}');
    expect(() => files(md)).not.toThrow();
  });

  it('a broken message names its key and its language', () => {
    expect(() => files(HEAD + row('ui.bad', 'Hello {name', 'مرحبا'))).toThrow(
      /ui\.bad: the en text is not valid ICU/,
    );
    expect(() => files(HEAD + row('ui.bad', 'Hello', 'مرحبا {'))).toThrow(
      /ui\.bad: the ar text is not valid ICU/,
    );
  });

  it('every message of the real deck is valid', () => {
    expect(() =>
      files(readFileSync(gen.DECK, 'utf8'), gen.readExtras(), { keycloak: true }),
    ).not.toThrow();
  });
});

describe('a key used in the code but missing from the catalog', () => {
  it('is reported with its file and line, and a key that exists is not', () => {
    const used = [
      { key: 'ui.sign-in', file: 'apps/a/page.tsx', line: 3 },
      { key: 'ui.no-such-message', file: 'apps/a/page.tsx', line: 9 },
    ];
    expect(gen.missingKeys(used, [...MESSAGE_KEYS])).toEqual([
      { key: 'ui.no-such-message', file: 'apps/a/page.tsx', line: 9 },
    ]);
  });

  it('is found by scanning the source: t(...) calls with a dotted key', () => {
    const found = gen.usedKeys(
      ['packages/i18n/test/fixtures/scan'],
      resolve(__dirname, '../../..'),
    );
    expect(found.map((f: { key: string }) => f.key).sort()).toEqual([
      'ui.accounts',
      'ui.made-up-key',
    ]);
    const missing = gen.missingKeys(found, [...MESSAGE_KEYS]);
    expect(missing.map((m: { key: string }) => m.key)).toEqual(['ui.made-up-key']);
  });

  it('the committed code uses no key outside the catalog', () => {
    const used = gen.usedKeys([
      'apps',
      'packages/ui-web/src',
      'packages/ui-native/src',
      'packages/auth-web/src',
    ]);
    expect(gen.missingKeys(used, [...MESSAGE_KEYS])).toEqual([]);
  });
});

describe('the committed files are what the deck gives', () => {
  it('catalogs and keys are up to date', () => {
    const real = files(readFileSync(gen.DECK, 'utf8'), gen.readExtras(), { keycloak: true });
    const read = (p: string) =>
      readFileSync(resolve(__dirname, '../src', p), 'utf8').replace(/\r\n/g, '\n');
    for (const [rel, content] of Object.entries(real)) expect(read(rel), rel).toBe(content);
  });
});

describe('the catalogs at run time', () => {
  it('the simulation banner is the very string of the platform label (FR-022)', () => {
    expect(translate('en', 'sim.banner')).toBe(SIM_LABEL_EN);
    expect(translate('ar', 'sim.banner')).toBe(SIM_LABEL_AR);
  });

  it('fills in arguments, and every language has every key', () => {
    expect(MESSAGE_KEYS.length).toBeGreaterThan(200);
    for (const key of MESSAGE_KEYS) {
      expect(translate('ar', key), key).not.toBe(key);
      expect(translate('en', key), key).not.toBe(key);
    }
    expect(Object.keys(catalogs)).toEqual(['ar', 'en']);
    expect(translator('en')('screen.con-002.title')).toBe('Sign-in');
  });

  it('the next-intl engine and the i18next setup give the same text as translate', async () => {
    const native = await createNativeI18n('ar');
    for (const key of [
      'sim.banner',
      'ui.sign-in',
      'screen.adm-003.title',
      'status.pending',
    ] as const) {
      expect(getTranslator('ar')(key)).toBe(translate('ar', key));
      expect(getTranslator('en')(key)).toBe(translate('en', key));
      expect(native.t(key)).toBe(translate('ar', key));
    }
    await native.changeLanguage('en');
    expect(native.t('ui.sign-in')).toBe(translate('en', 'ui.sign-in'));
  });
});

describe('the extra strings (impl.*) the approved deck does not hold', () => {
  const deck = HEAD + row('ui.one', 'One', 'واحد');
  const ok = { en: { impl: { copied: 'Copied' } }, ar: { impl: { copied: 'تم النسخ' } } };

  it('are merged into both catalogs and the keys', () => {
    const out = files(deck, ok);
    expect(JSON.parse(out['catalogs/en.json']!)).toEqual({
      impl: { copied: 'Copied' },
      ui: { one: 'One' },
    });
    expect(JSON.parse(out['catalogs/ar.json']!).impl.copied).toBe('تم النسخ');
    expect(out['keys.ts']).toContain("'impl.copied'");
  });

  it('must exist in both languages, start with impl., and not shadow a deck key', () => {
    expect(() => files(deck, { en: { impl: { a: 'A' } }, ar: {} })).toThrow(/impl\.a: no ar text/);
    expect(() => files(deck, { en: { ui: { two: 'Two' } }, ar: { ui: { two: 'اثنان' } } })).toThrow(
      /ui\.two: an extra string must start with impl\./,
    );
    expect(() => files(deck, { en: { impl: {} }, ar: {} })).not.toThrow();
  });

  it('must be valid ICU, like every other message', () => {
    expect(() =>
      files(deck, { en: { impl: { x: 'Hi {name' } }, ar: { impl: { x: 'مرحبا' } } }),
    ).toThrow(/impl\.x: the en text is not valid ICU/);
  });
});
