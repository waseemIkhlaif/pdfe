#!/usr/bin/env node
// `pnpm scenario <code> --seed <n> [--version <v>]`: resets the demo data and seeds it from a scenario, through the API of the
// running stack (`pnpm dev:all`). It signs in as the demo platform administrator (password and one-time code, the synthetic
// credentials of infra/keycloak/README.md), asks for the run, and prints the digest.
//
// If a digest is committed for this scenario, version and seed (db/seeds/scenarios/<code>/<version>.digest-seed<n>.txt), the
// result must equal it, or the script exits 1: that is the determinism check (SC-010).
//
//   pnpm scenario baseline --seed 42
//   pnpm scenario baseline --seed 42 --version v1
// Environment: API_URL (default http://localhost:4000), KEYCLOAK_URL (default http://localhost:8080).
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { totpFor } from './totp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REALM = 'pdfe-demo';
const PASSWORD = 'demo-password'; // synthetic: infra/keycloak/README.md
const USER = 'demo.admin.a';

/** Reads `<code> --seed <n> [--version <v>]` from the arguments. Throws a usage message when something is missing or wrong. */
export function parseArgs(argv) {
  const usage = 'usage: pnpm scenario <code> --seed <n> [--version <v>]';
  const [code, ...rest] = argv;
  if (!code || code.startsWith('-')) throw new Error(usage);
  const opts = { code, seed: undefined, version: undefined };
  for (let i = 0; i < rest.length; i += 2) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (value === undefined) throw new Error(usage);
    if (flag === '--seed') opts.seed = Number(value);
    else if (flag === '--version') opts.version = value;
    else throw new Error(usage);
  }
  if (!Number.isInteger(opts.seed) || opts.seed < 0)
    throw new Error(`${usage}\n--seed must be a whole number, 0 or more`);
  if (opts.version !== undefined && !/^v[0-9]+$/.test(opts.version)) {
    throw new Error(`${usage}\n--version looks like v1`);
  }
  return opts;
}

/** The committed digest for this scenario, version and seed, or null if none is committed. */
export function committedDigest(code, version, seed, root = ROOT) {
  const file = resolve(root, 'db/seeds/scenarios', code, `${version}.digest-seed${seed}.txt`);
  return existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
}

async function json(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function token(keycloak) {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'pdfe-tests',
    username: USER,
    password: PASSWORD,
    totp: totpFor(USER),
  });
  const res = await fetch(`${keycloak}/realms/${REALM}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const out = await json(res);
  if (!res.ok)
    throw new Error(
      `could not sign in as ${USER}: ${out.error_description ?? out.error ?? res.status}`,
    );
  return out.access_token;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const api = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
  const keycloak = (process.env.KEYCLOAK_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  const auth = { authorization: `Bearer ${await token(keycloak)}` };

  let version = opts.version;
  if (!version) {
    const listed = await fetch(`${api}/v1/demo/scenarios`, { headers: auth });
    const list = await json(listed);
    if (!listed.ok) {
      throw new Error(
        `could not list the scenarios (${listed.status}): ${list.error?.code ?? list.raw ?? 'unknown'}`,
      );
    }
    const versions = (list.items ?? []).filter((s) => s.code === opts.code).map((s) => s.version);
    if (versions.length === 0) throw new Error(`no scenario ${opts.code} is registered`);
    version = versions.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).at(-1);
  }

  const res = await fetch(`${api}/v1/demo/scenarios/${encodeURIComponent(opts.code)}/runs`, {
    method: 'POST',
    headers: {
      ...auth,
      'content-type': 'application/json',
      'idempotency-key': `scenario-${randomUUID()}`,
    },
    body: JSON.stringify({ version, seed: opts.seed }),
  });
  const run = await json(res);
  if (!res.ok)
    throw new Error(
      `the run was refused (${res.status}): ${run.error?.code ?? run.raw ?? 'unknown'}`,
    );
  if (run.status !== 'succeeded')
    throw new Error(`the run failed: ${run.error_code}. The data is in the reset state.`);

  const counts = Object.entries(run.report.tables)
    .map(([t, v]) => `${t.split('.').at(-1)}=${v.count}`)
    .join(' ');
  console.log(`scenario ${opts.code} ${version} seed ${opts.seed}: ${counts}`);
  console.log(`digest ${run.result_digest}`);

  const expected = committedDigest(opts.code, version, opts.seed);
  if (expected === null) {
    console.log('no digest is committed for this seed: nothing to compare with');
  } else if (expected !== run.result_digest) {
    console.error(`DIGEST MISMATCH: the committed digest is ${expected}`);
    process.exit(1);
  } else {
    console.log('the digest equals the committed one');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`scenario: ${err.message}`);
    process.exit(1);
  });
}
