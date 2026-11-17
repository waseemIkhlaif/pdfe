#!/usr/bin/env node
// `pnpm egress:probe`: from inside the api, worker and mock-hub containers, try to reach the public internet.
// Every probe must FAIL. These probes run without the in-process guard, so a pass proves the network layer alone
// (the internal Compose network) blocks outbound traffic. Writes egress-report.txt.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const SERVICES = ['api', 'worker', 'mock-hub'];

/** Each script exits 0 if the connection WAS made (bad) and 1 if it was blocked (good). */
export const PROBES = [
  {
    name: 'HTTPS fetch of a public site',
    script:
      "fetch('https://example.com', { signal: AbortSignal.timeout(5000) }).then(() => process.exit(0), () => process.exit(1));",
  },
  {
    name: 'raw TCP connect to a public IP address on port 443 (3 s timeout)',
    script:
      "const s = require('node:net').connect({ host: '1.1.1.1', port: 443, timeout: 3000 });" +
      "s.on('connect', () => process.exit(0)); s.on('error', () => process.exit(1)); s.on('timeout', () => process.exit(1));",
  },
  {
    name: 'DNS resolution of a public name',
    script: "require('node:dns').lookup('example.com', (err) => process.exit(err ? 1 : 0));",
  },
];

/** blocked = good, REACHED = the isolation failed, error = the probe itself could not run. */
export function classify({ status }) {
  if (status === 1) return 'blocked';
  if (status === 0) return 'REACHED';
  return 'error';
}

export function summarize(rows) {
  const lines = [
    'SIMULATION — NOT REAL MONEY / محاكاة — ليست أموالاً حقيقية',
    'Egress probe report: every probe must be blocked.',
    '',
  ];
  for (const r of rows) lines.push(`${r.result.padEnd(8)} ${r.service.padEnd(9)} ${r.probe}`);
  const passed = rows.every((r) => r.result === 'blocked');
  lines.push(
    '',
    passed
      ? 'RESULT: PASS (nothing reached the internet)'
      : 'RESULT: FAIL (see REACHED or error lines)',
  );
  return { passed, report: lines.join('\n') + '\n' };
}

function main() {
  process.env.COMPOSE_PROJECT_NAME ??= 'pdfe';
  const rows = [];
  for (const service of SERVICES) {
    for (const probe of PROBES) {
      const r = spawnSync(
        'docker',
        [
          'compose',
          '--env-file',
          '.env',
          '-f',
          'infra/docker-compose.yml',
          'exec',
          '-T',
          service,
          'node',
          '-e',
          probe.script,
        ],
        { cwd: ROOT, encoding: 'utf8', timeout: 30000 },
      );
      rows.push({ service, probe: probe.name, result: classify(r) });
    }
  }
  const { passed, report } = summarize(rows);
  writeFileSync(resolve(ROOT, 'egress-report.txt'), report);
  process.stdout.write(report);
  process.exit(passed ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
