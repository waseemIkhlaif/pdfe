import { expect, test, type APIRequestContext } from '@playwright/test';
import { APPS, baseUrl } from '../src/routes';
import { signedInContext } from '../src/sign-in';

/**
 * Follow one action across every component (SC-012). A signed-in user opens the error screen with `?simulate=500`: the
 * web app calls the API's DEMO-only failure endpoint, and the screen shows the correlation ID of that very request with a
 * button to copy it. Grafana (through the gateway on localhost:3000) then finds, by that ID, the log lines, the trace and
 * the audit event.
 */
const GRAFANA = 'http://localhost:3000';
const consumer = APPS.find((a) => a.name === 'web-consumer')!;

/** Retries while the log and trace pipelines catch up (batching and ingestion take some seconds). */
const eventually = { timeout: 120_000, intervals: [3_000, 5_000, 5_000, 10_000] };

async function lokiStreams(request: APIRequestContext, id: string) {
  const res = await request.get(
    `${GRAFANA}/api/datasources/proxy/uid/loki/loki/api/v1/query_range`,
    {
      params: { query: `{service_name=~".+"} | correlation_id="${id}"`, limit: '50' },
    },
  );
  expect(res.ok(), 'Loki through the Grafana proxy').toBe(true);
  const body = (await res.json()) as { data: { result: { stream: Record<string, string> }[] } };
  return body.data.result.map((r) => r.stream);
}

async function tempoTraces(request: APIRequestContext, id: string) {
  const res = await request.get(`${GRAFANA}/api/datasources/proxy/uid/tempo/api/search`, {
    params: { q: `{ span.correlation_id = "${id}" }` },
  });
  expect(res.ok(), 'Tempo through the Grafana proxy').toBe(true);
  return ((await res.json()) as { traces?: unknown[] }).traces ?? [];
}

async function auditActions(request: APIRequestContext, id: string): Promise<string[]> {
  const res = await request.post(`${GRAFANA}/api/ds/query`, {
    data: {
      from: 'now-1h',
      to: 'now',
      queries: [
        {
          refId: 'A',
          datasource: { uid: 'pdfe-audit' },
          format: 'table',
          rawQuery: true,
          rawSql: `SELECT action FROM audit.audit_events WHERE correlation_id = '${id.replace(/'/g, "''")}' ORDER BY seq`,
        },
      ],
    },
  });
  expect(res.ok(), 'the audit datasource through Grafana').toBe(true);
  const body = (await res.json()) as {
    results: { A: { frames?: { data: { values: string[][] } }[] } };
  };
  return body.results.A.frames?.[0]?.data.values[0] ?? [];
}

test('[web-consumer] the error screen shows a correlation ID that Grafana finds in logs, traces and the audit trail', async ({
  browser,
  request,
}, testInfo) => {
  const context = await signedInContext(browser, consumer, 'individual', 'en');
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: baseUrl(consumer),
  });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl(consumer)}/en/error?simulate=500`);

    // The screen: the ID inside <bdi>, and a button that copies it.
    const idEl = page.getByTestId('correlation-id');
    await expect(idEl).toBeVisible();
    expect(await idEl.evaluate((el) => el.tagName)).toBe('BDI');
    const id = (await idEl.innerText()).trim();
    expect(id).toMatch(/^COR-[0-9a-f-]+$/);

    const copy = page.getByTestId('copy-correlation-id');
    await expect(copy).toBeVisible();
    await copy.click();
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(id);

    // Grafana finds the same ID in all three places.
    await expect
      .poll(
        async () => (await lokiStreams(request, id)).map((s) => s.service_name).sort(),
        eventually,
      )
      .toContain('api');
    await expect
      .poll(async () => (await tempoTraces(request, id)).length, eventually)
      .toBeGreaterThan(0);
    await expect
      .poll(() => auditActions(request, id), eventually)
      .toContain('demo.error_simulated');

    // Evidence for docs/evidence/phase-2/correlation.md: the screen the user saw, and the dashboard for the same ID.
    await page.screenshot({ path: testInfo.outputPath('error-screen.png') });
    const dashboard = await context.newPage();
    try {
      await dashboard.setViewportSize({ width: 1400, height: 1100 });
      await dashboard.goto(
        `${GRAFANA}/d/pdfe-correlation?orgId=1&var-correlation_id=${encodeURIComponent(id)}&kiosk`,
      );
      await dashboard.waitForTimeout(8_000); // the panels run their queries
      await dashboard.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true });
    } finally {
      await dashboard.close();
    }
  } finally {
    await page.close();
  }
});

test('[web-consumer] the Grafana dashboard for one correlation ID is there', async ({
  request,
}) => {
  const res = await request.get(`${GRAFANA}/api/dashboards/uid/pdfe-correlation`);
  expect(res.ok()).toBe(true);
  const dash = (await res.json()) as { dashboard: { title: string; panels: { title: string }[] } };
  expect(dash.dashboard.panels.map((p) => p.title)).toEqual([
    'Logs of every service',
    'Traces',
    'Audit events',
    'Job logs (worker)',
  ]);
});
