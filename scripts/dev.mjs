#!/usr/bin/env node
// `pnpm dev`: the fast mode. Postgres and Redis run in Compose (published on localhost only);
// the apps run on the host with Turborepo watch. Only the code-level egress guard applies in this mode.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sh = process.platform === 'win32';
const compose = [
  'compose',
  '--env-file',
  '.env',
  '-f',
  'infra/docker-compose.yml',
  '-f',
  'infra/docker-compose.dev.yml',
];

const infra = spawnSync('docker', [...compose, 'up', '-d', '--wait', 'postgres', 'redis'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: sh,
});
if (infra.status !== 0) process.exit(infra.status ?? 1);

console.log(
  '\ndev: infrastructure is up. Starting the apps on the host (Ctrl+C to stop). Egress is guarded in code only in this mode.',
);
const dev = spawnSync('pnpm', ['turbo', 'run', 'dev', '--parallel'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: sh,
});
process.exit(dev.status ?? 0);
