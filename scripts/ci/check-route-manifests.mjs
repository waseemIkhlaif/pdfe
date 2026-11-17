#!/usr/bin/env node
// CI `static` job: every page of every web app must be in that app's route manifest, and every manifest entry must have
// a page (contracts/ui-shell.md, "Route manifest"). The label crawl (tests/e2e-web) visits exactly the manifest, so a
// page missing from it would escape the simulation-label check.
//   node scripts/ci/check-route-manifests.mjs [repo-root]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

/** `app/[locale]/settings/language/page.tsx` -> `/settings/language`. Route groups `(x)` do not count; `[locale]` is the language prefix. */
export function routeOf(pageFile, appDir) {
  const parts = relative(appDir, pageFile).split(sep).slice(0, -1);
  const segs = parts.filter((p) => !/^\(.*\)$/.test(p) && p !== '[locale]');
  return `/${segs.join('/')}`;
}

function pagesUnder(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...pagesUnder(p));
    else if (/^page\.(tsx|ts|jsx|js)$/.test(name)) out.push(p);
  }
  return out;
}

/** The entries of `export const routes = [ { path: '...', ... }, ... ]`: path and whether it has a baseline. */
export function manifestEntries(source) {
  const entries = [];
  for (const m of source.matchAll(/\{[^{}]*?path:\s*'([^']+)'[^{}]*?\}/g)) {
    entries.push({ path: m[1], baseline: /baseline:\s*'[^']+'/.test(m[0]) });
  }
  return entries;
}

/** Returns { problems: string[], withoutBaseline: string[] } for one app directory (`apps/web-x`). */
export function checkApp(appDir) {
  const problems = [];
  const manifestFile = join(appDir, 'src', 'routes.manifest.ts');
  if (!existsSync(manifestFile)) {
    return { problems: [`${appDir}: src/routes.manifest.ts is missing`], withoutBaseline: [] };
  }
  const entries = manifestEntries(readFileSync(manifestFile, 'utf8'));
  const inManifest = new Set(entries.map((e) => e.path));
  const onDisk = new Set(
    pagesUnder(join(appDir, 'app')).map((f) => routeOf(f, join(appDir, 'app'))),
  );
  for (const r of [...onDisk].sort()) {
    if (!inManifest.has(r))
      problems.push(`${appDir}: page ${r} exists but is not in routes.manifest.ts`);
  }
  for (const r of [...inManifest].sort()) {
    if (!onDisk.has(r))
      problems.push(`${appDir}: routes.manifest.ts lists ${r} but there is no page for it`);
  }
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.path))
      problems.push(`${appDir}: ${e.path} is listed twice in routes.manifest.ts`);
    seen.add(e.path);
  }
  return { problems, withoutBaseline: entries.filter((e) => !e.baseline).map((e) => e.path) };
}

export function checkAll(root) {
  const apps = readdirSync(join(root, 'apps'))
    .filter((n) => n.startsWith('web-'))
    .sort();
  const problems = [];
  const lines = [];
  for (const a of apps) {
    const r = checkApp(join(root, 'apps', a));
    problems.push(...r.problems);
    if (r.withoutBaseline.length)
      lines.push(`${a}: no design baseline yet: ${r.withoutBaseline.join(', ')}`);
  }
  return { apps, problems, lines };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { apps, problems, lines } = checkAll(process.argv[2] ?? process.cwd());
  for (const l of lines) console.log(l);
  if (problems.length) {
    for (const p of problems) console.error(`FAIL ${p}`);
    console.error(`${problems.length} route manifest problem(s)`);
    process.exit(1);
  }
  console.log(`route manifests ok (${apps.length} apps)`);
}
