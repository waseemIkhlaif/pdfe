import { defineConfig, devices } from '@playwright/test';
import { APPS, baseUrl } from './src/routes';

/**
 * One project per web app (its tests carry the app name in their title), one for Keycloak's login pages, and one for the
 * negative fixtures, which needs no running stack. Chromium only.
 */
export default defineConfig({
  testDir: './specs',
  fullyParallel: false,
  workers: 1, // sign-ins use one-time codes; one worker keeps their timing simple
  retries: process.env.CI ? 1 : 0,
  // Keep the files a passing test wrote too: the correlation spec saves screenshots that are evidence (SC-012).
  preserveOutput: 'always',
  timeout: 90_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  projects: [
    ...APPS.map((app) => ({
      name: app.name,
      testMatch: 'label.spec.ts',
      grep: new RegExp(`\\[${app.name}\\] `),
      use: { baseURL: baseUrl(app) },
    })),
    {
      name: 'keycloak',
      testMatch: 'label.spec.ts',
      grep: /\[keycloak\] /,
      use: { baseURL: 'http://localhost:8080' },
    },
    { name: 'negative', testMatch: 'label-negative.spec.ts' },
    { name: 'a11y', testMatch: 'a11y.spec.ts', use: { baseURL: 'http://localhost:3001' } },
    { name: 'shell', testMatch: 'shell.spec.ts', use: { baseURL: 'http://localhost:3001' } },
    { name: 'visual', testMatch: 'visual.spec.ts', use: { baseURL: 'http://localhost:3001' } },
    // One action followed through every component, with Grafana (SC-012). Needs the whole stack, lgtm included.
    {
      name: 'correlation',
      testMatch: 'correlation.spec.ts',
      use: { baseURL: 'http://localhost:3000' },
    },
  ],
});
