import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const API_DIR = resolve(__dirname, '..');
const MAIN = resolve(API_DIR, 'dist/main.js');
const DEMO_CONFIG = resolve(API_DIR, '../../infra/adapters.demo.json');
const fixture = (name: string) => resolve(__dirname, 'fixtures', name);

/** Starts the built API with --once (init, then exit) and returns the exit status and stderr. */
function start(env: Record<string, string | undefined>) {
  const r = spawnSync(process.execPath, [MAIN, '--once'], {
    cwd: API_DIR,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      ...env,
    } as NodeJS.ProcessEnv,
    encoding: 'utf8',
    timeout: 60000,
  });
  return { status: r.status, stderr: r.stderr, stdout: r.stdout };
}

beforeAll(() => {
  if (!existsSync(MAIN))
    throw new Error(
      'Build the api first (pnpm --filter @pdfe/api build): dist/main.js is missing.',
    );
});

describe('startup guard: mode', () => {
  it('LIVE exits 1 with "LIVE mode is not supported"', () => {
    const r = start({ APP_MODE: 'LIVE', ADAPTERS_CONFIG: DEMO_CONFIG });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('LIVE mode is not supported');
  });
  it.each([undefined, 'demo', ''])('APP_MODE=%j exits 1 with "APP_MODE must be DEMO"', (mode) => {
    const r = start({ APP_MODE: mode, ADAPTERS_CONFIG: DEMO_CONFIG });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('APP_MODE must be DEMO');
  });
});

describe('startup guard: adapters', () => {
  it('an http:real adapter exits 1 and names "bank: http:real"', () => {
    const r = start({ APP_MODE: 'DEMO', ADAPTERS_CONFIG: fixture('adapters.http-real.json') });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('bank: http:real');
  });
  it('a mock type with no implementation exits 1 and names "bank: mock:unknown"', () => {
    const r = start({ APP_MODE: 'DEMO', ADAPTERS_CONFIG: fixture('adapters.mock-unknown.json') });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('bank: mock:unknown');
  });
  it('a missing kind exits 1 and names it', () => {
    const r = start({ APP_MODE: 'DEMO', ADAPTERS_CONFIG: fixture('adapters.missing-kind.json') });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/missing adapter kind.*fx/);
  });
  it('an unknown kind exits 1 and names it', () => {
    const r = start({ APP_MODE: 'DEMO', ADAPTERS_CONFIG: fixture('adapters.unknown-kind.json') });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/unknown adapter kind.*card/);
  });
  it('a missing config file exits 1', () => {
    const r = start({ APP_MODE: 'DEMO', ADAPTERS_CONFIG: fixture('does-not-exist.json') });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('system.start_refused');
  });
});

describe('startup guard: safety-locked environment', () => {
  it('an extra internal host exits 1', () => {
    const r = start({
      APP_MODE: 'DEMO',
      ADAPTERS_CONFIG: DEMO_CONFIG,
      INTERNAL_HOSTS:
        'postgres,redis,keycloak,mock-hub,api,worker,lgtm,localhost,127.0.0.1,example.com',
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('example.com');
  });
});

describe('startup guard: the demo configuration starts normally', () => {
  it('exits 0', () => {
    const r = start({ APP_MODE: 'DEMO', ADAPTERS_CONFIG: DEMO_CONFIG });
    expect(r.stderr).not.toContain('start_refused');
    expect(r.status).toBe(0);
  });
});
