import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';
import { assertBanner } from '../src/banner-check';

/**
 * The label check must fail when the label is removed, covered, shortened or hidden: that is what makes a removal fail
 * the build (SC-011). The control fixture has a correct banner and must pass, so the failures are not just a broken check.
 */
const fixture = (name: string) => pathToFileURL(resolve(__dirname, '../fixtures', name)).href;
const QUICK = { timeout: 1_500 };

test('control: a correct banner passes', async ({ page }) => {
  await page.goto(fixture('good.html'));
  await assertBanner(page, 'en', 'control', QUICK);
});

for (const [name, why] of [
  ['no-banner.html', /exactly one simulation banner/],
  ['covered-banner.html', /something covers the banner/],
  ['altered-text.html', /the banner text in en/],
  ['hidden-banner.html', /banner must be visible/],
] as const) {
  test(`${name} fails the check, and the message says why`, async ({ page }) => {
    await page.goto(fixture(name));
    await expect(assertBanner(page, 'en', `fixture ${name}`, QUICK)).rejects.toThrow(why);
  });
}

test('the Arabic label is not accepted on an English page', async ({ page }) => {
  // The control fixture shows the English label; asking for Arabic must fail.
  await page.goto(fixture('good.html'));
  await expect(assertBanner(page, 'ar', 'language mismatch', QUICK)).rejects.toThrow(
    /the banner text in ar/,
  );
});

test('a failure names the app and the route it was checking', async ({ page }) => {
  await page.goto(fixture('no-banner.html'));
  await expect(assertBanner(page, 'en', 'web-consumer /sign-in', QUICK)).rejects.toThrow(
    /web-consumer \/sign-in/,
  );
});
