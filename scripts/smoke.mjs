#!/usr/bin/env node
// Smoke test for a running stack (fresh-clone job and `pnpm dev:all`).
// Every web app must serve its sign-in page with the full bilingual simulation label, and the API must report DEMO.
import { pathToFileURL } from 'node:url';

const EN = 'SIMULATION — NOT REAL MONEY';
const AR = 'محاكاة — ليست أموالاً حقيقية';

export const APPS = [
  ['web-consumer', 3001],
  ['web-merchant', 3002],
  ['web-business', 3003],
  ['web-console', 3004],
  ['web-investor', 3005],
  ['web-devportal', 3006],
];
const API = 'http://localhost:4000/v1/health';

/** Returns { checked, failures[] }. `fetchFn` is injectable for tests. */
export async function checkAll(fetchFn = fetch) {
  const failures = [];
  let checked = 0;

  for (const [name, port] of APPS) {
    const url = `http://localhost:${port}/ar/sign-in`;
    checked += 1;
    try {
      const res = await fetchFn(url);
      const html = await res.text();
      if (!res.ok) failures.push(`${name}: ${url} returned ${res.status}`);
      else if (!html.includes(EN))
        failures.push(`${name}: ${url} is missing the English simulation label`);
      else if (!html.includes(AR))
        failures.push(`${name}: ${url} is missing the Arabic simulation label`);
    } catch (err) {
      failures.push(`${name}: ${url} is not reachable (${err.message})`);
    }
  }

  checked += 1;
  try {
    const res = await fetchFn(API);
    const body = await res.json();
    if (!res.ok) failures.push(`api: ${API} returned ${res.status}`);
    else if (body.mode !== 'DEMO')
      failures.push(`api: ${API} reports mode ${JSON.stringify(body.mode)}, expected DEMO`);
  } catch (err) {
    failures.push(`api: ${API} is not reachable (${err.message})`);
  }

  return { checked, failures };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { checked, failures } = await checkAll();
  if (failures.length > 0) {
    for (const f of failures) console.error(`FAIL ${f}`);
    console.error(`smoke: ${failures.length} of ${checked} checks failed`);
    process.exit(1);
  }
  console.log(
    `smoke: ${checked} checks passed (6 web apps show the simulation label; api reports DEMO)`,
  );
}
