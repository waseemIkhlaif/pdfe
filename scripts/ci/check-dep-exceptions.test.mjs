import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluate, parseExceptions } from './check-dep-exceptions.mjs';

const MD = `# Dependency exceptions

| Package | Advisory ID | Severity | Reason | Expires (YYYY-MM-DD) | Attested by |
|---|---|---|---|---|---|
| left-pad | GHSA-aaaa-bbbb-cccc | high | dev-only, not reachable | 2026-12-31 | @owner |
| old-lib | CVE-2026-0001 | critical | waiting for upstream | 2026-01-01 | @owner |
`;

const audit = (advisories) => ({ advisories });
const trivy = (vulns) => ({ Results: [{ Target: 'pnpm-lock.yaml', Vulnerabilities: vulns }] });

test('parses the exceptions table', () => {
  const rows = parseExceptions(MD);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, 'GHSA-AAAA-BBBB-CCCC');
  assert.equal(rows[0].expires, '2026-12-31');
});

test('passes with no findings', () => {
  const r = evaluate({ audit: audit({}), trivy: trivy([]), exceptionsMd: MD, today: '2026-11-15' });
  assert.deepEqual(r.blocked, []);
});

test('ignores low and moderate findings', () => {
  const r = evaluate({
    audit: audit({ 1: { module_name: 'x', severity: 'moderate', github_advisory_id: 'GHSA-1' } }),
    trivy: trivy([{ VulnerabilityID: 'CVE-1', Severity: 'LOW', PkgName: 'y' }]),
    exceptionsMd: MD,
    today: '2026-11-15',
  });
  assert.deepEqual(r.blocked, []);
});

test('blocks a high finding without an exception', () => {
  const r = evaluate({
    audit: audit({
      1: { module_name: 'bad-lib', severity: 'high', github_advisory_id: 'GHSA-zzzz-zzzz-zzzz' },
    }),
    trivy: trivy([]),
    exceptionsMd: MD,
    today: '2026-11-15',
  });
  assert.equal(r.blocked.length, 1);
  assert.match(r.blocked[0], /bad-lib/);
  assert.match(r.blocked[0], /GHSA-ZZZZ-ZZZZ-ZZZZ/);
});

test('blocks a critical Trivy finding without an exception', () => {
  const r = evaluate({
    audit: audit({}),
    trivy: trivy([
      { VulnerabilityID: 'CVE-2026-9999', Severity: 'CRITICAL', PkgName: 'openssl-ish' },
    ]),
    exceptionsMd: MD,
    today: '2026-11-15',
  });
  assert.equal(r.blocked.length, 1);
  assert.match(r.blocked[0], /CVE-2026-9999/);
});

test('allows a finding covered by an unexpired exception', () => {
  const r = evaluate({
    audit: audit({
      1: { module_name: 'left-pad', severity: 'high', github_advisory_id: 'ghsa-aaaa-bbbb-cccc' },
    }),
    trivy: trivy([]),
    exceptionsMd: MD,
    today: '2026-11-15',
  });
  assert.deepEqual(r.blocked, []);
  assert.equal(r.excepted.length, 1);
});

test('blocks a finding whose exception has expired', () => {
  const r = evaluate({
    audit: audit({}),
    trivy: trivy([{ VulnerabilityID: 'CVE-2026-0001', Severity: 'CRITICAL', PkgName: 'old-lib' }]),
    exceptionsMd: MD,
    today: '2026-11-15',
  });
  assert.equal(r.blocked.length, 1);
  assert.match(r.blocked[0], /expired/);
});
