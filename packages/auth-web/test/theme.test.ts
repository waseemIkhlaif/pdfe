import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SIM_LABEL_AR, SIM_LABEL_EN } from '@pdfe/platform-core/sim-label';

// The Keycloak login theme cannot import TypeScript, so its banner text is a copy. This keeps the copy equal to the single source.
const THEME = resolve(__dirname, '../../../infra/keycloak/themes/pdfe/login');
const read = (f: string) => readFileSync(resolve(THEME, f), 'utf8').replace(/\r\n/g, '\n');

describe('Keycloak login theme', () => {
  it.each(['en', 'ar'])('messages_%s carries the label text exactly, in both languages', (lang) => {
    const p = Object.fromEntries(
      read(`messages/messages_${lang}.properties`)
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    );
    expect(p.simulationLabelEn).toBe(SIM_LABEL_EN);
    expect(p.simulationLabelAr).toBe(SIM_LABEL_AR);
  });

  it('extends the Keycloak v2 login theme', () => {
    expect(read('theme.properties')).toMatch(/^parent=keycloak\.v2$/m);
  });

  it('renders the banner as the first thing in the body, as a status region marked data-sim', () => {
    const t = read('template.ftl');
    const body = t.indexOf('<body');
    const banner = t.indexOf('data-sim="1"');
    const header = t.indexOf('id="kc-header"');
    expect(body).toBeGreaterThan(0);
    expect(banner).toBeGreaterThan(body);
    expect(banner).toBeLessThan(header);
    expect(t).toContain('role="status"');
    expect(t).toContain('html[lang="ar"] .pdfe-sim-en');
    expect(t).toContain('msg("simulationLabelEn")');
    expect(t).toContain('msg("simulationLabelAr")');
  });

  it('is the realm login theme, with Arabic and English', () => {
    const realm = JSON.parse(
      readFileSync(resolve(__dirname, '../../../infra/keycloak/realm-pdfe-demo.json'), 'utf8'),
    );
    expect(realm.loginTheme).toBe('pdfe');
    expect(realm.supportedLocales.sort()).toEqual(['ar', 'en']);
  });
});
