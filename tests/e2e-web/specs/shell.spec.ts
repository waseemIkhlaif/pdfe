import { expect, test } from '@playwright/test';
import { APPS, baseUrl } from '../src/routes';
import { signedInContext } from '../src/sign-in';

// The shell (SC-013): navigation by permission, badges, language, direction, the five states, the role picker.
const consumer = APPS.find((a) => a.name === 'web-consumer')!;
const console_ = APPS.find((a) => a.name === 'web-console')!;

test('[web-console] navigation follows the permissions of the role, and the badges are visible', async ({
  browser,
}) => {
  for (const [role, has, hasNot] of [
    ['platform_admin', '/en/admin/users', '/en/audit'],
    ['auditor', '/en/audit', '/en/admin/users'],
  ] as const) {
    const ctx = await signedInContext(browser, console_, role, 'en');
    const page = await ctx.newPage();
    await page.goto(`${baseUrl(console_)}/en`);
    const nav = page.getByRole('complementary');
    await expect(nav.locator(`a[href="${has}"]`)).toHaveCount(1);
    await expect(nav.locator(`a[href="${hasNot}"]`)).toHaveCount(0);
    await expect(page.getByTestId('tenant-badge')).toBeVisible();
    await expect(page.getByTestId('role-badge')).toBeVisible();
    await expect(page.getByTestId('env-badge')).toHaveText('DEMO');
    await page.close();
  }
});

test('[web-consumer] the language sets lang and dir', async ({ browser }) => {
  const ctx = await signedInContext(browser, consumer, 'individual', 'en');
  const page = await ctx.newPage();
  for (const [lang, dir] of [
    ['ar', 'rtl'],
    ['en', 'ltr'],
  ] as const) {
    await page.goto(`${baseUrl(consumer)}/${lang}/settings/language`);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('html')).toHaveAttribute('dir', dir);
  }
  await page.close();
});

test('[web-consumer] every state of the home page renders', async ({ browser }) => {
  const ctx = await signedInContext(browser, consumer, 'individual', 'en');
  const page = await ctx.newPage();
  await page.goto(`${baseUrl(consumer)}/en?state=loading`);
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await page.goto(`${baseUrl(consumer)}/en?state=denied`);
  await expect(page.locator('[data-state="denied"]')).toBeVisible();
  await page.goto(`${baseUrl(consumer)}/en?state=empty`);
  await expect(page.locator('[data-state="empty"]')).toBeVisible();
  await page.goto(`${baseUrl(consumer)}/en?state=error`);
  await expect(page.getByTestId('correlation-id')).toBeVisible();
  await page.close();
});

test('[web-consumer] the role picker starts the sign-in with the chosen demo user', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl(consumer)}/en/sign-in`);
  await page.getByTestId('role-demo.individual').click();
  await expect(page.locator('#username')).toHaveValue('demo.individual');
  await context.close();
});

test('[web-console] a privileged role is asked for the one-time code', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl(console_)}/en/sign-in`);
  await page.getByTestId('role-demo.admin.a').click();
  await page.locator('#password').fill('demo-password');
  await page.locator('#kc-login').click();
  await expect(page.locator('#otp')).toBeVisible();
  await context.close();
});
