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

describe('Keycloak login theme: styling and the sign-in words (T182)', () => {
  it('links the generated stylesheet after the parent theme styles, and shows the demo notice under the form', () => {
    const tpl = read('template.ftl');
    expect(tpl).toContain('${url.resourcesPath}/css/pdfe.css');
    expect(tpl.indexOf('${url.resourcesPath}/css/pdfe.css')).toBeGreaterThan(
      tpl.indexOf('properties.styles'),
    );
    expect(tpl).toContain('msg("demoAccountsOnly")');
    expect(tpl.indexOf('demoAccountsOnly')).toBeGreaterThan(tpl.indexOf('<#nested "form">'));
  });

  it('the stylesheet is the design tokens followed by the login rules (run node infra/keycloak/generate-theme.mjs)', () => {
    const css = read('resources/css/pdfe.css');
    const tokens = readFileSync(
      resolve(__dirname, '../../design-tokens/dist/web/tokens.css'),
      'utf8',
    ).replace(/\r\n/g, '\n');
    expect(css.startsWith(tokens.trimEnd())).toBe(true);
    expect(css.trimEnd().endsWith(read('login-theme.css').trimEnd())).toBe(true);
  });

  it('uses only token variables for colour and logical properties for direction', () => {
    const rules = read('login-theme.css');
    expect(rules).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(rules).not.toMatch(/(margin|padding|border)-(left|right)/);
    expect(rules).not.toMatch(/(^|[;{\s])(left|right)\s*:/);
    expect(rules).toContain('var(--pdfe-color-brand-primary)');
  });

  it.each([
    ['en', 'Sign in', 'Sign-in', 'Enter your code'],
    ['ar', 'دخول', 'تسجيل الدخول', 'أدخل الرمز'],
  ])('messages_%s have the approved sign-in, title and code words', (lang, signIn, title, code) => {
    const p = Object.fromEntries(
      read(`messages/messages_${lang}.properties`)
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
    );
    expect(p.doLogIn).toBe(signIn);
    expect(p.loginAccountTitle).toBe(title);
    expect(p.loginOtpOneTime).toBe(code);
    expect(p.demoAccountsOnly).toBeTruthy();
  });
});
