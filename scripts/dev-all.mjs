#!/usr/bin/env node
// `pnpm dev:all`: the whole stack in containers (acceptance mode), then the smoke test, then the URL table.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sh = process.platform === 'win32';

// One image at a time: parallel builds each run pnpm install and can exhaust Docker's memory.
process.env.COMPOSE_PARALLEL_LIMIT ??= '1';

const up = spawnSync(
  'docker',
  [
    'compose',
    '--env-file',
    '.env',
    '-f',
    'infra/docker-compose.yml',
    'up',
    '-d',
    '--build',
    '--wait',
  ],
  {
    cwd: ROOT,
    stdio: 'inherit',
    shell: sh,
  },
);
if (up.status !== 0) {
  console.error(
    'dev:all: the stack did not become healthy. Run `docker compose -f infra/docker-compose.yml logs` to see why.',
  );
  process.exit(up.status ?? 1);
}

const smoke = spawnSync(process.execPath, ['scripts/smoke.mjs'], { cwd: ROOT, stdio: 'inherit' });
if (smoke.status !== 0) process.exit(smoke.status ?? 1);

console.log(`
All services are healthy.
  consumer   http://localhost:3001      merchant   http://localhost:3002      business   http://localhost:3003
  console    http://localhost:3004      investor   http://localhost:3005      devportal  http://localhost:3006
  API        http://localhost:4000/v1/health
Stop with: pnpm down     Reset data with: pnpm reset`);
