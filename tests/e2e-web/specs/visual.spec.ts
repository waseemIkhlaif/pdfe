import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';
import { APPS, LANGS, baseUrl, pathIn } from '../src/routes';
import { signedInContext } from '../src/sign-in';

// Built screens against the approved baselines (FR-033), per language and size. A difference above 1% fails unless
// docs/design/qa/phase-02-approved-diffs.md lists it: `| SCREEN | lang | size | max ratio | reason |`.
const BASE = resolve(__dirname, '../../../docs/design/packages/phase-02/baseline');
const APPROVED = resolve(__dirname, '../../../docs/design/qa/phase-02-approved-diffs.md');
const THRESHOLD = 0.01;
const SIZES: Record<string, [number, number]> = {
  m390: [390, 844],
  t768: [768, 1024],
  w1280: [1280, 800],
};

const allowed = (id: string, lang: string, size: string): number => {
  if (!existsSync(APPROVED)) return THRESHOLD;
  for (const l of readFileSync(APPROVED, 'utf8').split('\n')) {
    const c = l.split('|').map((x) => x.trim());
    if (c[1] === id && c[2] === lang && c[3] === size)
      return Math.max(THRESHOLD, Number(c[4]) || 0);
  }
  return THRESHOLD;
};

interface R {
  path: string;
  roles: readonly string[];
  baseline?: string;
  example?: string;
}
const missing: string[] = [];
for (const app of APPS) {
  for (const route of app.routes as readonly R[]) {
    if (!route.baseline) {
      missing.push(`${app.name} ${route.path}`);
      continue;
    }
    for (const lang of LANGS) {
      for (const size of app.name === 'web-consumer' ? ['m390', 'w1280'] : ['t768', 'w1280']) {
        test(`[${app.name}] ${route.path} ${lang} ${size} matches ${route.baseline}`, async ({
          browser,
        }, info) => {
          const file = resolve(BASE, lang, `${route.baseline}@${size}.png`);
          test.skip(!existsSync(file), `no baseline ${route.baseline}@${size}`);
          const [width, height] = SIZES[size]!;
          const role = route.roles[0]!;
          const context =
            role === 'anonymous'
              ? await browser.newContext({ viewport: { width, height } })
              : await signedInContext(browser, app, role, lang);
          const page = await context.newPage();
          await page.setViewportSize({ width, height });
          try {
            await page.goto(`${baseUrl(app)}${pathIn(lang, route.example ?? route.path)}`);
            await page.waitForLoadState('networkidle');
            const shot = PNG.sync.read(await page.screenshot());
            const want = PNG.sync.read(readFileSync(file));
            expect([shot.width, shot.height], 'size').toEqual([want.width, want.height]);
            const diff = new PNG({ width: want.width, height: want.height });
            const n = pixelmatch(shot.data, want.data, diff.data, want.width, want.height, {
              threshold: 0.2,
            });
            const ratio = n / (want.width * want.height);
            await info.attach('diff', { body: PNG.sync.write(diff), contentType: 'image/png' });
            await info.attach('actual', { body: PNG.sync.write(shot), contentType: 'image/png' });
            expect(ratio, `${route.baseline} ${lang} ${size}`).toBeLessThanOrEqual(
              allowed(route.baseline!, lang, size),
            );
          } finally {
            await page.close();
            if (role === 'anonymous') await context.close();
          }
        });
      }
    }
  }
}

test('routes with no baseline are listed', () => {
  console.log(`no baseline: ${missing.join(', ')}`);
});
