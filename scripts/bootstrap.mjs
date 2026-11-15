#!/usr/bin/env node
// `pnpm bootstrap`: check prerequisites, install, write .env (once), build shared packages, build images. Idempotent.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PNPM = '11.0.9';

/** Returns a list of problems (empty when everything is as documented). Inputs are injected for tests. */
export function checkPrereqs({ node, pnpm, docker }) {
  const problems = [];
  const major = Number(String(node).split('.')[0]);
  if (!(major >= 22)) problems.push(`Node ${node} found, but Node 22 or newer is required.`);
  if (pnpm !== PNPM)
    problems.push(
      `pnpm ${pnpm || 'not found'} found, but pnpm ${PNPM} is required (corepack prepare pnpm@${PNPM} --activate).`,
    );
  if (!docker)
    problems.push(
      'Docker was not found or is not running. Install Docker Desktop (WSL2 on Windows) and start it.',
    );
  return problems;
}

/**
 * Writes .env from .env.example with a fresh random value for every <generated>, expanding ${NAME} references.
 * Never overwrites an existing .env.
 */
export function ensureEnv({ root = ROOT, randomHex = () => randomBytes(24).toString('hex') } = {}) {
  const target = join(root, '.env');
  if (existsSync(target)) return 'kept';
  const values = new Map();
  const lines = readFileSync(join(root, '.env.example'), 'utf8').split(/\r?\n/);
  const out = lines.map((line) => {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (!m) return line;
    let value = m[2];
    if (value === '<generated>') value = randomHex();
    value = value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, name) => values.get(name) ?? '');
    values.set(m[1], value);
    return `${m[1]}=${value}`;
  });
  writeFileSync(target, out.join('\n'));
  return 'created';
}

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: ROOT,
    shell: process.platform === 'win32',
    ...opts,
  });
const probe = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32' });
  return r.status === 0 ? r.stdout.trim() : '';
};

function main() {
  process.env.COMPOSE_PARALLEL_LIMIT ??= '1'; // one image at a time (memory)
  const problems = checkPrereqs({
    node: process.versions.node,
    pnpm: probe('pnpm', ['--version']),
    docker: probe('docker', ['info', '--format', '{{.ServerVersion}}']) !== '',
  });
  if (problems.length > 0) {
    for (const p of problems) console.error(`bootstrap: ${p}`);
    process.exit(1);
  }
  const steps = [
    ['install dependencies', () => run('pnpm', ['install', '--frozen-lockfile'])],
    ['write .env', () => (console.log(`.env ${ensureEnv()}`), { status: 0 })],
    [
      'build shared packages',
      () => run('pnpm', ['turbo', 'run', 'build', '--filter=./packages/*']),
    ],
    [
      'build container images',
      () =>
        run('docker', ['compose', '--env-file', '.env', '-f', 'infra/docker-compose.yml', 'build']),
    ],
  ];
  for (const [name, fn] of steps) {
    console.log(`\n== bootstrap: ${name}`);
    const r = fn();
    if (r.status !== 0) {
      console.error(`bootstrap: "${name}" failed`);
      process.exit(r.status ?? 1);
    }
  }
  console.log('\nbootstrap complete. Next: pnpm dev:all');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
