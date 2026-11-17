import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { checkApp, checkAll, manifestEntries, routeOf } from './check-route-manifests.mjs';

/** A temporary app: `pages` are paths under app/, `manifest` the source of src/routes.manifest.ts (or null for none). */
function app(pages, manifest) {
  const root = mkdtempSync(join(tmpdir(), 'routes-'));
  const dir = join(root, 'apps', 'web-x');
  for (const p of pages) {
    const f = join(dir, 'app', p);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, 'export default function P() { return null; }\n');
  }
  if (manifest !== null) {
    mkdirSync(join(dir, 'src'), { recursive: true });
    writeFileSync(join(dir, 'src', 'routes.manifest.ts'), manifest);
  }
  return { root, dir, done: () => rmSync(root, { recursive: true, force: true }) };
}
const manifest = (...entries) => `export const routes = [\n${entries.join(',\n')},\n] as const;\n`;
const entry = (path, extra = '') => `  { path: '${path}', roles: ['a']${extra} }`;

test('routeOf drops the locale segment and route groups, and keeps dynamic segments', () => {
  const dir = join('a', 'app');
  assert.equal(routeOf(join(dir, '[locale]', 'page.tsx'), dir), '/');
  assert.equal(routeOf(join(dir, '[locale]', 'sign-in', 'page.tsx'), dir), '/sign-in');
  assert.equal(
    routeOf(join(dir, '[locale]', '(admin)', 'admin', 'config', '[key]', 'page.tsx'), dir),
    '/admin/config/[key]',
  );
});

test('manifestEntries reads each path and whether it has a baseline', () => {
  const e = manifestEntries(manifest(entry('/', ", baseline: 'CON-008'"), entry('/x')));
  assert.deepEqual(e, [
    { path: '/', baseline: true },
    { path: '/x', baseline: false },
  ]);
});

test('a manifest that matches the pages on disk passes', () => {
  const t = app(
    ['[locale]/page.tsx', '[locale]/sign-in/page.tsx'],
    manifest(entry('/'), entry('/sign-in')),
  );
  try {
    assert.deepEqual(checkApp(t.dir).problems, []);
  } finally {
    t.done();
  }
});

test('a page on disk with no manifest entry fails, and the message names the route', () => {
  const t = app(['[locale]/page.tsx', '[locale]/secret/page.tsx'], manifest(entry('/')));
  try {
    const { problems } = checkApp(t.dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /page \/secret exists but is not in routes\.manifest\.ts/);
  } finally {
    t.done();
  }
});

test('a manifest entry with no page fails, and the message names the route', () => {
  const t = app(['[locale]/page.tsx'], manifest(entry('/'), entry('/ghost')));
  try {
    const { problems } = checkApp(t.dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /lists \/ghost but there is no page for it/);
  } finally {
    t.done();
  }
});

test('an app with no manifest fails', () => {
  const t = app(['[locale]/page.tsx'], null);
  try {
    assert.match(checkApp(t.dir).problems[0], /routes\.manifest\.ts is missing/);
  } finally {
    t.done();
  }
});

test('a route listed twice fails, and dynamic routes match their directories', () => {
  const t = app(
    ['[locale]/page.tsx', '[locale]/admin/config/[key]/page.tsx'],
    manifest(entry('/'), entry('/'), entry('/admin/config/[key]')),
  );
  try {
    const { problems } = checkApp(t.dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /listed twice/);
  } finally {
    t.done();
  }
});

test('routes without a design baseline are listed, not failed', () => {
  const t = app(
    ['[locale]/page.tsx', '[locale]/x/page.tsx'],
    manifest(entry('/', ", baseline: 'CON-008'"), entry('/x')),
  );
  try {
    const r = checkApp(t.dir);
    assert.deepEqual(r.problems, []);
    assert.deepEqual(r.withoutBaseline, ['/x']);
    assert.match(checkAll(t.root).lines[0], /no design baseline yet: \/x/);
  } finally {
    t.done();
  }
});

test('the real repository passes', () => {
  const r = checkAll(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
  assert.deepEqual(r.problems, []);
  assert.equal(r.apps.length, 6);
});
