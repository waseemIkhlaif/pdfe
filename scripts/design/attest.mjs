#!/usr/bin/env node
// Records YOUR review and approval decisions in the design artifacts. It never decides anything for you:
// run it only after you have actually done the review. Solo mode: these are dated self-attestations
// (docs/governance/solo-mode-exception.md). No dependencies.
//
//   node scripts/design/attest.mjs copy phase-NN [--arabic] [--native] [--legal]
//       --arabic  you reviewed every Arabic string                       (AR review: pending -> done)
//       --native  a native speaker spot-checked the money/status/sim/regulated rows   (Native check: pending -> done)
//       --legal   you (as legal/compliance) approved the regulated rows  (Legal: pending -> approved)
//       Rows whose required reviews are all complete become Status=approved.
//   node scripts/design/attest.mjs package phase-NN --by <github-login>
//       Needs the copy deck fully approved. Marks the phase screens Hi-fi=approved, the manifest approved,
//       appends the approval row, then runs the package gate; on failure everything is restored.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const D = path.join(root, 'docs', 'design');
const [cmd, phaseArg, ...rest] = process.argv.slice(2);
const m = /^phase-(\d{1,2})$/.exec(phaseArg || '');
if (!['copy', 'package'].includes(cmd) || !m) { console.error('usage: attest.mjs copy|package phase-NN [options]  (see the header of this file)'); process.exit(2); }
const NN = String(parseInt(m[1], 10)).padStart(2, '0');
const flag = (f) => rest.includes(f);
const cells = (l) => l.split('|').slice(1, -1).map((x) => x.trim());
const today = new Date().toISOString().slice(0, 10);

function copy() {
  const file = path.join(D, 'copy-decks', `phase-${NN}.md`);
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let touched = 0, approved = 0, open = 0;
  const out = lines.map((l) => {
    if (!l.startsWith('|')) return l;
    const c = cells(l);
    if (c.length !== 9 || c[0] === 'Key' || /^-+$/.test(c[0])) return l;
    if (c[7] === 'retired') return l;
    if (flag('--arabic') && c[4] === 'pending') { c[4] = 'done'; touched++; }
    if (flag('--native') && c[5] === 'pending') { c[5] = 'done'; touched++; }
    if (flag('--legal') && c[6] === 'pending') { c[6] = 'approved'; touched++; }
    const ready = c[4] === 'done' && c[5] !== 'pending' && c[6] !== 'pending';
    if (ready) c[7] = 'approved';
    ready ? approved++ : open++;
    return '| ' + c.join(' | ') + ' |';
  });
  fs.writeFileSync(file, out.join('\n'));
  console.log(`copy deck phase-${NN}: ${touched} review fields recorded; ${approved} rows approved, ${open} still need reviews`);
}

function pkg() {
  const by = rest[rest.indexOf('--by') + 1];
  if (!by || by.startsWith('--')) { console.error('--by <github-login> is required (it is written into the approval row)'); process.exit(2); }
  const deck = fs.readFileSync(path.join(D, 'copy-decks', `phase-${NN}.md`), 'utf8').split(/\r?\n/).filter((l) => l.startsWith('|')).map(cells).filter((c) => c.length === 9 && c[0] !== 'Key' && !/^-+$/.test(c[0]));
  const notDone = deck.filter((c) => !['approved', 'retired'].includes(c[7]));
  if (notDone.length) { console.error(`copy deck phase-${NN} still has ${notDone.length} unapproved rows. Do the reviews first (attest.mjs copy ...).`); process.exit(1); }

  const files = { inv: path.join(D, 'screen-inventory.md'), man: path.join(D, 'packages', `phase-${NN}`, 'manifest.md'), app: path.join(D, 'approvals.md') };
  const backup = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, fs.readFileSync(f, 'utf8')]));
  const restore = () => Object.entries(files).forEach(([k, f]) => fs.writeFileSync(f, backup[k]));
  try {
    fs.writeFileSync(files.inv, backup.inv.split(/\r?\n/).map((l) => {
      if (!l.startsWith('|')) return l;
      const c = cells(l);
      if (c.length !== 14 || !/^[A-Z]{3}-\d{3}$/.test(c[0]) || parseInt(c[3], 10) !== parseInt(NN, 10)) return l;
      c[10] = 'approved';
      return '| ' + c.join(' | ') + ' |';
    }).join('\n'));
    fs.writeFileSync(files.man, backup.man.replace(/^\*\*Status\*\*:.*$/m, '**Status**: approved'));
    const row = `| phase-${NN} | 1 | Design lead + Product owner + Legal/compliance | @${by.replace(/^@/, '')} | ${today} | yes | docs/design/packages/phase-${NN}/export | — | | |`;
    fs.writeFileSync(files.app, backup.app.replace(/\s*$/, '\n') + row + '\n');
    const r = spawnSync('bash', ['scripts/design/check-design.sh', '--gate', `phase-${NN}`], { cwd: root, encoding: 'utf8' });
    process.stdout.write((r.stdout || '').split('\n').filter((l) => /^FAIL|^PASS D-(2|13|16)/.test(l)).join('\n') + '\n');
    if (r.status !== 0) { restore(); console.error(`The gate for phase-${NN} failed; nothing was changed.`); process.exit(1); }
    console.log(`phase-${NN} approved by @${by} on ${today} (solo self-attestation, Solo=yes). Commit these changes in a pull request.`);
  } catch (e) { restore(); throw e; }
}
if (cmd === 'copy') copy(); else pkg();
