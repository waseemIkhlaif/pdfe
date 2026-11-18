import { test } from '@playwright/test';
import { assertBanner } from '../src/banner-check';
import { APPS, LANGS, baseUrl, pathIn } from '../src/routes';
import { signedInContext, userFor } from '../src/sign-in';

/**
 * Every route of every web app, in Arabic and English, signed in as the role that route lists, shows the simulation
 * banner (SC-011). The routes come from the apps' own manifests, and `check-route-manifests` makes sure that is every page.
 * A failure names the app and the route.
 */
// A route with a variable part is visited at its example, or at an ID that does not exist (the not-found page carries the banner too).
const NONE = '00000000-0000-0000-0000-000000000000';
for (const app of APPS) {
  for (const route of app.routes as readonly {
    path: string;
    roles: readonly string[];
    example?: string;
  }[]) {
    for (const role of route.roles) {
      for (const lang of LANGS) {
        test(`[${app.name}] ${route.path} (${lang}) as ${role}`, async ({ browser, page }) => {
          const path = route.example ?? route.path.replace(/\[[a-z]+\]/g, NONE);
          const where = `${app.name} ${route.path} (${lang}) as ${role}`;
          if (role === 'anonymous') {
            await page.goto(`${baseUrl(app)}${pathIn(lang, path)}`);
            await assertBanner(page, lang, where);
            return;
          }
          const context = await signedInContext(browser, app, role, lang);
          const signedIn = await context.newPage();
          try {
            await signedIn.goto(`${baseUrl(app)}${pathIn(lang, path)}`);
            await assertBanner(signedIn, lang, where);
          } finally {
            await signedIn.close();
          }
        });
      }
    }
  }
}

/**
 * The pages Keycloak serves during sign-in carry the banner too (through the `pdfe` login theme). The client requires
 * PKCE, so the request carries a code challenge (the RFC 7636 example value); the code is never exchanged here.
 */
const KEYCLOAK_AUTH = 'http://localhost:8080/realms/pdfe-demo/protocol/openid-connect/auth';
const authUrl = (lang: string) =>
  `${KEYCLOAK_AUTH}?client_id=web-consumer&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(
    'http://localhost:3001/api/auth/callback',
  )}&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&code_challenge_method=S256&ui_locales=${lang}`;

for (const lang of LANGS) {
  test(`[keycloak] password page (${lang})`, async ({ page }) => {
    await page.goto(authUrl(lang));
    await assertBanner(page, lang, `keycloak password page (${lang})`);
  });

  test(`[keycloak] one-time-password page (${lang})`, async ({ page }) => {
    const user = await userFor('auditor');
    await page.goto(authUrl(lang));
    await page.locator('#username').fill(user.username);
    await page.locator('#password').fill('demo-password');
    await page.locator('#kc-login').click();
    await page.locator('#otp').waitFor();
    await assertBanner(page, lang, `keycloak one-time-password page (${lang})`);
  });
}
