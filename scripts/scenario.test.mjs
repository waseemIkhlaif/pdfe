import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { committedDigest, parseArgs } from './scenario.mjs';

test('reads the code, the seed and an optional version', () => {
  assert.deepEqual(parseArgs(['baseline', '--seed', '42']), {
    code: 'baseline',
    seed: 42,
    version: undefined,
  });
  assert.deepEqual(parseArgs(['baseline', '--seed', '0', '--version', 'v2']), {
    code: 'baseline',
    seed: 0,
    version: 'v2',
  });
  assert.deepEqual(parseArgs(['baseline', '--version', 'v1', '--seed', '7']), {
    code: 'baseline',
    seed: 7,
    version: 'v1',
  });
});

test('refuses missing, malformed or unknown arguments with the usage line', () => {
  for (const bad of [
    [],
    ['--seed', '1'],
    ['baseline'],
    ['baseline', '--seed'],
    ['baseline', '--seed', 'x'],
    ['baseline', '--seed', '-1'],
    ['baseline', '--seed', '1.5'],
    ['baseline', '--seed', '1', '--version', 'one'],
    ['baseline', '--seed', '1', '--colour', 'red'],
  ]) {
    assert.throws(() => parseArgs(bad), /usage: pnpm scenario/, JSON.stringify(bad));
  }
});

test('finds the committed digest for a scenario, version and seed, or says there is none', () => {
  const root = mkdtempSync(join(tmpdir(), 'scn-'));
  mkdirSync(join(root, 'db/seeds/scenarios/baseline'), { recursive: true });
  writeFileSync(
    join(root, 'db/seeds/scenarios/baseline/v1.digest-seed42.txt'),
    `${'ab'.repeat(32)}\n`,
  );
  assert.equal(committedDigest('baseline', 'v1', 42, root), 'ab'.repeat(32));
  assert.equal(committedDigest('baseline', 'v1', 43, root), null);
  assert.equal(committedDigest('baseline', 'v2', 42, root), null);
});

test('the committed baseline digest is in the repository', () => {
  assert.match(committedDigest('baseline', 'v1', 42), /^[0-9a-f]{64}$/);
});
