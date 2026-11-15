#!/usr/bin/env node
// CI `deps` job: fail on any high or critical dependency finding (pnpm audit or Trivy) that has no unexpired,
// dated row in docs/security/dependency-exceptions.md.
//   node scripts/ci/check-dep-exceptions.mjs <audit.json> <trivy.json>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Rows of the exceptions table: { id, pkg, expires }. */
export function parseExceptions(md) {
  const rows = [];
  for (const line of md.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 6 || /^-+$/.test(cells[0] ?? '') || cells[0] === 'Package') continue;
    rows.push({ pkg: cells[0], id: cells[1].toUpperCase(), expires: cells[4] });
  }
  return rows;
}

const SEVERE = new Set(['high', 'critical']);

/** Collect findings from both tools into { id, pkg, severity, source }. Missing or odd shapes give no findings. */
function findings(audit, trivy) {
  const out = [];
  for (const a of Object.values(audit?.advisories ?? {})) {
    const sev = String(a.severity ?? '').toLowerCase();
    if (!SEVERE.has(sev)) continue;
    out.push({
      id: String(a.github_advisory_id ?? a.cves?.[0] ?? a.id ?? 'unknown').toUpperCase(),
      pkg: a.module_name ?? a.name ?? 'unknown',
      severity: sev,
      source: 'pnpm audit',
    });
  }
  for (const res of trivy?.Results ?? []) {
    for (const v of res.Vulnerabilities ?? []) {
      const sev = String(v.Severity ?? '').toLowerCase();
      if (!SEVERE.has(sev)) continue;
      out.push({
        id: String(v.VulnerabilityID).toUpperCase(),
        pkg: v.PkgName ?? 'unknown',
        severity: sev,
        source: 'trivy',
      });
    }
  }
  return out;
}

/** `today` is YYYY-MM-DD. Returns { blocked: string[], excepted: string[] }. */
export function evaluate({ audit, trivy, exceptionsMd, today }) {
  const rows = parseExceptions(exceptionsMd);
  const blocked = [];
  const excepted = [];
  for (const f of findings(audit, trivy)) {
    const label = `${f.severity} ${f.id} in ${f.pkg} (${f.source})`;
    const row = rows.find((r) => r.id === f.id);
    if (!row) blocked.push(`${label}: no documented exception`);
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.expires) || row.expires < today)
      blocked.push(`${label}: exception expired or undated (${row.expires})`);
    else excepted.push(`${label}: excepted until ${row.expires}`);
  }
  return { blocked, excepted };
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {};
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [auditPath, trivyPath] = process.argv.slice(2);
  const today = new Date().toISOString().slice(0, 10);
  const { blocked, excepted } = evaluate({
    audit: readJson(auditPath),
    trivy: readJson(trivyPath),
    exceptionsMd: readFileSync('docs/security/dependency-exceptions.md', 'utf8'),
    today,
  });
  for (const e of excepted) console.log(`excepted: ${e}`);
  for (const b of blocked) console.error(`BLOCKED: ${b}`);
  if (blocked.length > 0) process.exit(1);
  console.log('deps: no unexcepted high or critical findings');
}
