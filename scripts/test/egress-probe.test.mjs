import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PROBES, SERVICES, classify, summarize } from '../egress-probe.mjs';

test('every probe script is valid JavaScript', () => {
  for (const p of PROBES) assert.doesNotThrow(() => new Function(p.script), `probe ${p.name}`);
});

test('probes the three application services with three probes each', () => {
  assert.deepEqual([...SERVICES].sort(), ['api', 'mock-hub', 'worker']);
  assert.equal(PROBES.length, 3);
});

test('exit 1 means the connection was blocked (good); exit 0 means it got through (bad)', () => {
  assert.equal(classify({ status: 1 }), 'blocked');
  assert.equal(classify({ status: 0 }), 'REACHED');
});

test('any other outcome means the probe could not run', () => {
  assert.equal(classify({ status: 125 }), 'error');
  assert.equal(classify({ status: null }), 'error');
});

test('passes only when every probe in every service was blocked', () => {
  const ok = summarize([
    { service: 'api', probe: 'a', result: 'blocked' },
    { service: 'worker', probe: 'a', result: 'blocked' },
  ]);
  assert.equal(ok.passed, true);
  const bad = summarize([
    { service: 'api', probe: 'a', result: 'blocked' },
    { service: 'worker', probe: 'a', result: 'REACHED' },
  ]);
  assert.equal(bad.passed, false);
  assert.match(bad.report, /REACHED/);
});

test('a probe that could not run also fails the run (no false comfort)', () => {
  assert.equal(summarize([{ service: 'api', probe: 'a', result: 'error' }]).passed, false);
});

test('the report is labelled as simulation evidence', () => {
  assert.match(summarize([]).report, /SIMULATION/);
});
