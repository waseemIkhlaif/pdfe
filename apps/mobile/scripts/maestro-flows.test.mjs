import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

// The label flows are YAML, so their text is a copy of the label. This keeps the copy equal to the single source
// (packages/platform-core/src/sim-label.ts), and keeps one flow per tab and language.
const here = dirname(fileURLToPath(import.meta.url));
const flows = join(here, '..', 'maestro');
const source = readFileSync(
  join(here, '..', '..', '..', 'packages', 'platform-core', 'src', 'sim-label.ts'),
  'utf8',
);
const EN = /SIM_LABEL_EN = '([^']+)'/.exec(source)[1];
const AR = /SIM_LABEL_AR = '([^']+)'/.exec(source)[1];
const TABS = ['home', 'pay', 'send', 'markets', 'profile'];
// Prettier writes YAML strings with single quotes; the quote style does not matter here.
const read = (f) =>
  readFileSync(join(flows, f), 'utf8').replace(/\r\n/g, '\n').replaceAll("'", '"');

test('there is one label flow per tab and language, and nothing else in the folder', () => {
  const want = TABS.flatMap((t) => ['ar', 'en'].map((l) => `label-${t}-${l}.yaml`)).sort();
  assert.deepEqual(readdirSync(flows).sort(), want);
  assert.equal(want.length, 10);
});

for (const tab of TABS) {
  for (const lang of ['ar', 'en']) {
    test(`label-${tab}-${lang}.yaml opens the tab in the language and asserts the exact label`, () => {
      const y = read(`label-${tab}-${lang}.yaml`);
      const [shown, hidden] = lang === 'ar' ? [AR, EN] : [EN, AR];
      assert.match(y, /^appId: org\.pdfe\.demo$/m);
      const lines = y.split('\n');
      assert.ok(
        lines.includes(`- openLink: pdfe://?lang=${lang}`),
        'opens the app in the language',
      );
      assert.ok(lines.includes(`    id: tab-${tab}`), 'taps the tab');
      assert.ok(y.includes(`- assertVisible: "${shown}"`), 'asserts the label of the language');
      assert.ok(
        y.includes(`- assertNotVisible: "${hidden}"`),
        'asserts the other label is not shown',
      );
      assert.ok(lines.includes('    id: simulation-banner'), 'checks the banner by its test ID');
    });
  }
}

test('the app link scheme and package match the flows', () => {
  const app = JSON.parse(readFileSync(join(here, '..', 'app.json'), 'utf8')).expo;
  assert.equal(app.scheme, 'pdfe');
  assert.equal(app.android.package, 'org.pdfe.demo');
});
