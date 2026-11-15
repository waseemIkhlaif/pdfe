#!/usr/bin/env node
// `pnpm test`: every test layer. Unit, then integration (Testcontainers), then end to end if the stack is running.
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sh = process.platform === 'win32';
const run = (cmd, args) =>
  spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: sh }).status ?? 1;

const ran = [];
const layers = [
  ['scripts', () => run(process.execPath, ['--test', 'scripts/**/*.test.mjs'])],
  ['unit', () => run('pnpm', ['turbo', 'run', 'test:unit'])],
  ['integration', () => run('pnpm', ['turbo', 'run', 'test:int'])],
];
for (const [name, fn] of layers) {
  console.log(`\n== pnpm test: ${name}`);
  if (fn() !== 0) {
    console.error(`pnpm test: ${name} failed (layers run so far: ${[...ran, name].join(', ')})`);
    process.exit(1);
  }
  ran.push(name);
}

const stackUp =
  spawnSync(process.execPath, ['scripts/smoke.mjs'], { cwd: ROOT, stdio: 'ignore' }).status === 0;
if (stackUp) {
  console.log('\n== pnpm test: end to end (stack is running)');
  if (run('pnpm', ['--filter', '@pdfe/e2e-web', 'test']) !== 0) process.exit(1);
  ran.push('e2e');
} else {
  console.log(
    '\npnpm test: end-to-end layer skipped (start the stack with `pnpm dev:all` to include it)',
  );
}
console.log(`\npnpm test: all layers passed (${ran.join(', ')})`);
