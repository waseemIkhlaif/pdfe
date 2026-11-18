#!/usr/bin/env node
// Writes the files of the Keycloak login theme that come from elsewhere:
//   resources/css/pdfe.css   the design tokens (packages/design-tokens) followed by login-theme.css
//   (the messages are written by packages/i18n: node packages/i18n/scripts/generate.mjs)
//
//   node infra/keycloak/generate-theme.mjs           writes them
//   node infra/keycloak/generate-theme.mjs --check   exits 1 when the committed file is out of date
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = resolve(HERE, 'themes/pdfe/login');
const TOKENS = resolve(HERE, '../../packages/design-tokens/dist/web/tokens.css');
const OUT = resolve(THEME, 'resources/css/pdfe.css');
const lf = (s) => s.replace(/\r\n/g, '\n');

/** The stylesheet: tokens first (the variables), then the login rules that use them. */
export function build() {
  if (!existsSync(TOKENS)) {
    throw new Error(
      'packages/design-tokens/dist/web/tokens.css is missing: build the tokens first (pnpm turbo run build --filter @pdfe/design-tokens)',
    );
  }
  return `${lf(readFileSync(TOKENS, 'utf8')).trimEnd()}\n\n${lf(readFileSync(resolve(THEME, 'login-theme.css'), 'utf8')).trimEnd()}\n`;
}

function main() {
  const css = build();
  if (process.argv.includes('--check')) {
    const have = existsSync(OUT) ? lf(readFileSync(OUT, 'utf8')) : null;
    if (have !== css) {
      console.error(
        'theme: resources/css/pdfe.css is out of date: run node infra/keycloak/generate-theme.mjs',
      );
      process.exit(1);
    }
    console.log('theme: pdfe.css is up to date');
    return;
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, css, 'utf8');
  console.log('theme: wrote resources/css/pdfe.css');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
