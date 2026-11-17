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

// The flows write the label with backslash-u escapes (see the ASCII test below); decode them to compare with the source.
const raw = (f) => readFileSync(join(flows, f), 'utf8').replace(/\r\n/g, '\n');
const decode = (s) =>
  s.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
// Prettier may write YAML strings with either quote; the quote style does not matter here.
const read = (f) => decode(raw(f)).replaceAll("'", '"');
const isAscii = (s) => [...s].every((c) => c.charCodeAt(0) < 128);

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

test("the flows are plain ASCII, so Maestro reads them the same whatever the machine's character set is", () => {
  // A run on CI read the flows in a non-UTF-8 character set and turned every non-ASCII character into garbage,
  // which made the Arabic assertions meaningless. Escapes in the YAML cannot be misread.
  for (const f of readdirSync(flows)) {
    assert.ok(isAscii(raw(f)), `${f} must contain only ASCII characters`);
  }
});

test('each flow waits for the app to start before it opens the language link', () => {
  // A link that reaches the app while it is still starting is dropped (React Native logs it and ignores it).
  for (const f of readdirSync(flows)) {
    const lines = raw(f).split('\n');
    const launch = lines.indexOf('- launchApp:');
    const wait = lines.indexOf('    id: simulation-banner');
    const open = lines.findIndex((l) => l.startsWith('- openLink:'));
    assert.ok(
      launch >= 0 && wait > launch && open > wait,
      `${f}: launchApp, then wait for the banner, then openLink`,
    );
  }
});

test('the app link scheme and package match the flows', () => {
  const app = JSON.parse(readFileSync(join(here, '..', 'app.json'), 'utf8')).expo;
  assert.equal(app.scheme, 'pdfe');
  assert.equal(app.android.package, 'org.pdfe.demo');
});
