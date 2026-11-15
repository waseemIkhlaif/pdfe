import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { checkPrereqs, ensureEnv } from '../bootstrap.mjs';

const OK = { node: '22.12.0', pnpm: '11.0.9', docker: true };

test('accepts the documented prerequisites', () => {
  assert.deepEqual(checkPrereqs(OK), []);
  assert.deepEqual(checkPrereqs({ ...OK, node: '25.2.1' }), []);
});

test('fails with a clear message when Node is below 22', () => {
  const p = checkPrereqs({ ...OK, node: '20.11.0' });
  assert.equal(p.length, 1);
  assert.match(p[0], /Node/);
  assert.match(p[0], /22/);
});

test('fails when pnpm is not 11.0.9', () => {
  const p = checkPrereqs({ ...OK, pnpm: '10.2.0' });
  assert.equal(p.length, 1);
  assert.match(p[0], /pnpm 11\.0\.9/);
});

test('fails when Docker is missing', () => {
  const p = checkPrereqs({ ...OK, docker: false });
  assert.equal(p.length, 1);
  assert.match(p[0], /Docker/);
});

test('reports every problem at once', () => {
  assert.equal(checkPrereqs({ node: '18.0.0', pnpm: '9.0.0', docker: false }).length, 3);
});

function workdir() {
  const dir = mkdtempSync(join(tmpdir(), 'pdfe-boot-'));
  writeFileSync(
    join(dir, '.env.example'),
    [
      '# comment',
      'APP_MODE=DEMO',
      'APP_ROLE_PASSWORD=<generated>',
      'SESSION_SECRET=<generated>',
      'DATABASE_URL=postgres://app_role:${APP_ROLE_PASSWORD}@postgres:5432/pdfe',
      '',
    ].join('\n'),
  );
  return dir;
}

test('creates .env with a fresh random value for every <generated> and expands references', () => {
  const dir = workdir();
  try {
    let n = 0;
    const r = ensureEnv({ root: dir, randomHex: () => `rand${++n}` });
    assert.equal(r, 'created');
    const env = readFileSync(join(dir, '.env'), 'utf8');
    assert.match(env, /^APP_MODE=DEMO$/m);
    assert.match(env, /^APP_ROLE_PASSWORD=rand1$/m);
    assert.match(env, /^SESSION_SECRET=rand2$/m);
    assert.match(env, /^DATABASE_URL=postgres:\/\/app_role:rand1@postgres:5432\/pdfe$/m);
    assert.ok(!env.includes('<generated>'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('never overwrites an existing .env, and a second run changes nothing', () => {
  const dir = workdir();
  try {
    writeFileSync(join(dir, '.env'), 'MINE=1\n');
    assert.equal(ensureEnv({ root: dir, randomHex: () => 'x' }), 'kept');
    assert.equal(readFileSync(join(dir, '.env'), 'utf8'), 'MINE=1\n');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const dir2 = workdir();
  try {
    ensureEnv({ root: dir2, randomHex: () => 'a' });
    const first = readFileSync(join(dir2, '.env'), 'utf8');
    assert.equal(ensureEnv({ root: dir2, randomHex: () => 'b' }), 'kept');
    assert.equal(readFileSync(join(dir2, '.env'), 'utf8'), first);
    assert.ok(existsSync(join(dir2, '.env')));
  } finally {
    rmSync(dir2, { recursive: true, force: true });
  }
});
