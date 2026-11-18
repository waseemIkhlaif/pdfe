import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { APPS, LANGS, baseUrl, pathIn } from '../src/routes';
import { signedInContext } from '../src/sign-in';

// Accessibility (SC-011): axe on every static route of every app, in both languages and every state it declares.
// Serious and critical findings fail. Dynamic routes (an ID created at run time) are covered by shell.spec.ts.
interface R {
  path: string;
  roles: readonly string[];
  states?: readonly string[];
  example?: string;
  dynamic?: string;
}
for (const app of APPS) {
  for (const route of app.routes as readonly R[]) {
    if (route.dynamic) continue;
    const path = route.example ?? route.path;
    for (const lang of LANGS) {
      for (const state of route.states ?? ['populated']) {
        test(`[${app.name}] ${path} ${lang} ${state} has no serious accessibility issue`, async ({
          browser,
        }) => {
          const role = route.roles[0]!;
          const context =
            role === 'anonymous'
              ? await browser.newContext()
              : await signedInContext(browser, app, role, lang);
          const page = await context.newPage();
          try {
            const q = state === 'populated' ? '' : `?state=${state}`;
            await page.goto(`${baseUrl(app)}${pathIn(lang, path)}${q}`);
            await page.waitForLoadState('networkidle');
            const results = await new AxeBuilder({ page })
              .withTags(['wcag2a', 'wcag2aa'])
              .analyze();
            const bad = results.violations.filter(
              (v) => v.impact === 'serious' || v.impact === 'critical',
            );
            expect(bad.map((v) => `${v.id}: ${v.nodes.length} node(s)`)).toEqual([]);
          } finally {
            await page.close();
            if (role === 'anonymous') await context.close();
          }
        });
      }
    }
  }
}
