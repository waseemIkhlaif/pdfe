import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { SystemClock } from '@pdfe/platform-core';
import { totp } from '@pdfe/test-kit';
import { baseUrl, type Lang, type WebApp } from './routes';

interface DemoUser {
  username: string;
  role: string;
  otpSecret: string | null;
}

const PASSWORD = 'demo-password'; // synthetic: infra/keycloak/README.md
let users: DemoUser[] | undefined;
async function demoUsers(): Promise<DemoUser[]> {
  if (!users) {
    const file = resolve(__dirname, '../../../infra/keycloak/generate-realm.mjs');
    users = ((await import(pathToFileURL(file).href)) as { USERS: DemoUser[] }).USERS;
  }
  return users;
}

/** Keycloak refuses a one-time code that was already used in its 30-second window, so wait for the next one. */
const clock = new SystemClock(); // real time: Keycloak checks the code against its own clock
const lastStep = new Map<string, number>();
async function freshCode(user: DemoUser): Promise<string> {
  const step = () => Math.floor(clock.now().getTime() / 30_000);
  if (lastStep.get(user.username) === step()) {
    await new Promise((r) => setTimeout(r, 30_000 - (clock.now().getTime() % 30_000) + 500));
  }
  lastStep.set(user.username, step());
  return totp(user.otpSecret!);
}

/** The first demo user holding `role`. */
export async function userFor(role: string): Promise<DemoUser> {
  const u = (await demoUsers()).find((x) => x.role === role);
  if (!u) throw new Error(`no demo user has the role ${role}`);
  return u;
}

/** Fills Keycloak's own password page, and the one-time-password page for a console role. */
export async function completeKeycloakLogin(page: Page, user: DemoUser): Promise<void> {
  await page.locator('#username').fill(user.username);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#kc-login').click();
  if (user.otpSecret) {
    await page.locator('#otp').fill(await freshCode(user));
    await page.locator('#kc-login').click();
  }
}

const sessions = new Map<string, Promise<BrowserContext>>();

/**
 * A browser context signed in to `app` as a demo user with `role`, through the real Keycloak pages (the second factor
 * with the fixed synthetic secret for a console role). One sign-in per app and role for the whole run.
 */
export function signedInContext(
  browser: Browser,
  app: WebApp,
  role: string,
  lang: Lang,
): Promise<BrowserContext> {
  const key = `${app.name}:${role}`;
  let ctx = sessions.get(key);
  if (!ctx) {
    ctx = (async () => {
      const user = await userFor(role);
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(`${baseUrl(app)}/api/auth/sign-in?returnTo=/${lang}`);
      await completeKeycloakLogin(page, user);
      await page.waitForURL(new RegExp(`^${baseUrl(app)}/`), { timeout: 30_000 });
      expect(page.url(), 'sign-in must return to the app').toContain(baseUrl(app));
      await page.close();
      return context;
    })();
    sessions.set(key, ctx);
  }
  return ctx;
}
