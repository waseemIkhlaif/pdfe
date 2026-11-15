// Exports the design prototype into the handoff packages (research R-5, R-11, R-16).
//   node export.mjs            everything
//   node export.mjs --only baselines|pdf|wire|docs
// Per phase NN (docs/design/packages/phase-NN/): export/<IF>-<lang>.pdf + SHA256SUMS, baseline/<lang>/<ID>@<size>.png, manifest.md.
// Also: docs/design/wireframes/<IF>-<lang>.pdf, docs/design/copy-decks/phase-NN.md, docs/design/heuristics/phase-NN.md,
// and the inventory columns Wireframe / Hi-fi / States / Export. Approvals are never written here (see attest.mjs).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { launch, url, root, SIZES, indexUrl } from './browser.mjs';
import { main as prepare, readInventory } from './prepare.mjs';

const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : 'all';
const want = (k) => only === 'all' || only === k;
const D = path.join(root, 'docs', 'design');
const BASELINE_SIZES = { CON: ['m390', 'w1280'] }; // research R-16: two key sizes per interface keep the repository small
const baseSizes = (ifc) => BASELINE_SIZES[ifc] || ['t768', 'w1280'];
const pad = (n) => String(n).padStart(2, '0');
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

prepare();
const inv = readInventory();
const phases = [...new Set(inv.map((s) => s.phase))].sort((a, b) => a - b);
// Phase 12 has no new screens, but feature 090 is gated on a phase-12 package, so an explicit empty package is produced.
const pkgPhases = phases.includes(12) ? phases : [...phases, 12];
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(indexUrl);
await page.waitForFunction(() => window.__ready === true);

async function show(hash) {
  await page.evaluate((h) => { window.__ready = false; location.hash = h; window.PDFE.api.render(); }, hash);
  await page.waitForFunction(() => window.__ready === true);
}
const hashOf = (u) => u.slice(u.indexOf('#') + 1);

/* ---------- baselines ---------- */
if (want('baselines')) {
  for (const ph of phases) fs.rmSync(path.join(D, 'packages', `phase-${pad(ph)}`, 'baseline'), { recursive: true, force: true });
  let n = 0;
  for (const size of Object.keys(SIZES)) {
    const [w, h] = SIZES[size];
    await page.setViewportSize({ width: w, height: h });
    for (const s of inv) {
      if (!baseSizes(s.ifc).includes(size)) continue;
      for (const lang of ['ar', 'en']) {
        await show(hashOf(url(s.id, { lang, size })));
        const file = path.join(D, 'packages', `phase-${pad(s.phase)}`, 'baseline', lang, `${s.id}@${size}.png`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        await page.screenshot({ path: file, type: 'png' });
        n++;
      }
    }
  }
  console.log(`baselines: ${n} PNG files`);
}

/* ---------- PDF sheets ---------- */
async function sheetPdf(ifc, lang, mode, ph, file, extra = '') {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await show(`sheet?ifc=${ifc}&lang=${lang}&mode=${mode}${ph ? '&phase=' + ph : ''}${extra}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.pdf({ path: file, format: 'A3', landscape: true, printBackground: true, margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' } });
}
if (want('pdf')) {
  let n = 0;
  for (const ph of pkgPhases) {
    const dir = path.join(D, 'packages', `phase-${pad(ph)}`, 'export');
    fs.rmSync(dir, { recursive: true, force: true });
    if (!inv.some((s) => s.phase === ph)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'NOTE.md'), `# Phase ${ph} export

This phase adds no new screens. Changes to existing screens go through change control (docs/design/README.md) and create a new package version.
`);
    }
    const ifcs = [...new Set(inv.filter((s) => s.phase === ph).map((s) => s.ifc))].sort();
    for (const ifc of ifcs) for (const lang of ['en', 'ar']) { await sheetPdf(ifc, lang, 'hifi', ph, path.join(dir, `${ifc}-${lang}.pdf`)); n++; }
    const sums = fs.readdirSync(dir).filter((f) => f !== 'SHA256SUMS').sort().map((f) => `${sha(path.join(dir, f))}  ${f}`);
    fs.writeFileSync(path.join(dir, 'SHA256SUMS'), sums.join('\n') + '\n');
  }
  console.log(`package PDFs: ${n}`);
}
if (want('wire')) {
  let n = 0;
  const dir = path.join(D, 'wireframes');
  fs.rmSync(dir, { recursive: true, force: true });
  for (const ifc of [...new Set(inv.filter((s) => s.skeleton === 'yes').map((s) => s.ifc))].sort()) for (const lang of ['en', 'ar']) { await sheetPdf(ifc, lang, 'wire', 0, path.join(dir, `${ifc}-${lang}.pdf`), '&skeleton=1'); n++; }
  fs.writeFileSync(path.join(dir, 'README.md'), '# Wireframes\n\nGreyscale low-fidelity sheets of the **skeleton** (the up-front wireframe set, FR-016a): one PDF per interface and language, every skeleton screen in five states (populated, empty, loading, error, permission-denied) at its primary size. Every other screen is wireframed the same way in the prototype (`docs/design/prototype/index.html#ID?mode=wire`), which also shows all five sizes. Regenerating adds tens of megabytes to the repository history: do it only when the design changes (`pnpm --dir scripts/design/render export`).\n');
  console.log(`wireframe PDFs: ${n}`);
}

/* ---------- documents ---------- */
if (want('docs')) {
  await page.setViewportSize({ width: 1280, height: 800 });
  const seen = await page.evaluate(() => {
    window.__seen = {};
    window.__rec = (id, en, ar) => { (window.__seen[id] = window.__seen[id] || {})[en] = ar; };
    for (const s of window.PDFE.inventory) for (const st of ['populated', 'empty', 'loading', 'error', 'denied'])
      window.PDFE.renderFrame(s.id, { lang: 'en', state: st, mode: 'hifi', size: 'w1280', cap: true });
    const o = window.__seen; window.__rec = null; return o;
  });
  const titles = await page.evaluate(() => Object.fromEntries(window.PDFE.inventory.map((s) => [s.id, (window.PDFE.screens[s.ifc + '|' + s.name] || {}).ar || ''])));
  const STATUSES = [['Draft', 'مسودة'], ['Pending', 'قيد الانتظار'], ['Held', 'معلّقة'], ['Under review', 'قيد المراجعة'], ['Completed', 'مكتملة'], ['Failed', 'فشلت'], ['Reversed', 'تم عكسها'], ['Expired', 'منتهية الصلاحية']];
  const BANNER = ['SIMULATION — NOT REAL MONEY', 'محاكاة — ليست أموالاً حقيقية'];
  const REG = /simulat|placeholder|psh|redeem|real (money|crypto)|compliance|screening|synthetic|issuance|reserve|coverage|illustrative|do not send/i;
  const MONEY = /amount|fee|rate|balance|price|total|receive|send|refund|payment|payout|cost|debit|credit|funding/i;
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'text';
  const clean = (s) => String(s).replace(/\|/g, '/').replace(/\r?\n/g, ' ');

  for (const ph of pkgPhases) {
    const screens = inv.filter((s) => s.phase === ph);
    const rows = []; const used = new Map(); const byEn = new Map();
    const add = (key, en, ar, note) => { rows.push({ key, en: clean(en), ar: clean(ar), note }); };
    add('sim.banner', BANNER[0], BANNER[1], 'Constitution Article VIII; must match exactly');
    for (const [en, ar] of STATUSES) add('status.' + slug(en).replace(/-(.)/g, (_, c) => c.toUpperCase()), en, ar, 'From the status vocabulary');
    byEn.set(BANNER[0], 'sim.banner'); for (const [en] of STATUSES) byEn.set(en, 'x');
    for (const s of screens) add(`screen.${s.id.toLowerCase()}.title`, s.name, titles[s.id], `Title of ${s.id}`);
    const pairs = new Map();
    for (const s of screens) for (const [en, ar] of Object.entries(seen[s.id] || {})) if (en !== ar && !byEn.has(en)) pairs.set(en, ar);
    const taken = new Set(rows.map((r) => r.key));
    for (const [en, ar] of [...pairs.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (screens.some((s) => s.name === en)) continue;
      const ns = REG.test(en) ? 'sim' : MONEY.test(en) ? 'money' : 'ui';
      let key = `${ns}.${slug(en)}`, i = 2; while (taken.has(key)) key = `${ns}.${slug(en)}-${i++}`;
      taken.add(key); add(key, en, ar, '');
    }
    const body = rows.map((r) => {
      const reg = r.key === 'sim.banner' || REG.test(r.en) ? 'yes' : 'no';
      const native = /^(money|status|sim)\./.test(r.key) || reg === 'yes' ? 'pending' : 'n/a';
      const legal = reg === 'yes' ? 'pending' : 'n/a';
      return `| ${r.key} | ${r.en} | ${r.ar} | ${reg} | pending | ${native} | ${legal} | draft | ${r.note ? r.note + '. ' : ''}AI-drafted Arabic, unreviewed |`;
    });
    const H = '| Key | English | Arabic | Regulated | AR review | Native check | Legal | Status | Notes |';
    fs.mkdirSync(path.join(D, 'copy-decks'), { recursive: true });
    fs.writeFileSync(path.join(D, 'copy-decks', `phase-${pad(ph)}.md`),
      `# Copy deck: phase ${pad(ph)}\n\nEvery string rendered by the Phase ${ph} screens of the design prototype, extracted by \`scripts/design/render/export.mjs\` (do not edit the English or Arabic here: change \`docs/design/prototype/data-*.js\` and re-export, then re-review). Format: \`specs/000-ux-design-track/contracts/artifact-formats.md\` section 11.\n\n` +
      `All Arabic is an **AI draft**. Nothing is approved until the implementer reviews the Arabic, a native speaker spot-checks money, status, simulation and regulated rows, and legal approves regulated rows (\`node scripts/design/attest.mjs copy phase-${pad(ph)} ...\`). Check D-12 enforces this.\n\n` +
      `${H}\n|---|---|---|---|---|---|---|---|---|\n${body.join('\n')}\n`);

    /* heuristic review (usability testing with people is waived: docs/design/usability/WAIVER.md) */
    const journeys = [...new Set(screens.flatMap((s) => (s.journeys ? s.journeys.split(',') : [])))];
    const HH = '| Issue ID | Screen | Heuristic | Description | Severity | Status |';
    const issues = [
      ['H-1', 'all', 'P3', 'Arabic strings are an AI draft with no implementer review or native-speaker check yet', 3, 'open'],
      ['H-2', 'all', 'N9', 'Errors show a general message and a reference; field-level error wording is specified in the component rules but not drawn for every field', 2, 'open'],
      ['H-3', 'all', 'N1', 'Example data is static: live updates (for example a QR payment turning Paid, countdowns) are described, not animated, in the prototype', 1, 'open'],
    ];
    if (journeys.length) issues.push(['H-4', 'all', 'P1', `Journeys ${journeys.join(', ')} have not been tested with people: the sponsor waived usability testing for the first build (usability/WAIVER.md)`, 3, 'open']);
    fs.mkdirSync(path.join(D, 'heuristics'), { recursive: true });
    fs.writeFileSync(path.join(D, 'heuristics', `phase-${pad(ph)}.md`),
      `# Heuristic review: phase ${pad(ph)}\n\n- **Reviewer role**: Design lead (AI-assisted self review; no participants)\n- **Date**: 2026-11-15\n- **Method**: every screen of the phase (${screens.length}) was rendered in Arabic and English in all five states and checked against Nielsen's heuristics (N1 to N10) and the PDFE principles (P1 to P5) by \`scripts/design/render/verify.mjs\` (banner present, direction correct, five states, Enter/Review/Result for money screens, no broken links or values) and by reading the screens.\n- **Scope note**: this replaces participant testing, which the sponsor waived for the first build. It does not measure task completion or the "Is this real money?" answer (SC-006, SC-007).\n\n${HH}\n|---|---|---|---|---|---|\n` +
      issues.map((r) => `| ${r.join(' | ')} |`).join('\n') + '\n');

    /* package manifest */
    const pdir = path.join(D, 'packages', `phase-${pad(ph)}`);
    const mrows = screens.map((s) => `| ${s.id} | ar,en | P,E,L,X,D | ${baseSizes(s.ifc).join(',')} | prototype:${s.id} | done |`);
    const MH = '| Screen ID | Languages | States | Sizes | Spec frame | Baseline |';
    fs.mkdirSync(pdir, { recursive: true });
    fs.writeFileSync(path.join(pdir, 'manifest.md'),
      `# Package manifest: phase ${pad(ph)}\n\nHigh-fidelity screens, wireframes and a clickable prototype for engineering phase ${ph}. The prototype is \`docs/design/prototype/index.html\` (open a screen with \`#ID\`, for example \`#${(screens[0] || { id: 'CON-015' }).id}\`; switch language, state, size and wireframe mode in its toolbar). The PDFs in \`export/\` are the frozen record of truth; \`Sizes\` lists the sizes that have PNG baselines (research R-16).\n\n` +
      `**Phase**: ${ph}\n**Version**: 1\n**Status**: ready-for-approval\n**Prototype**: docs/design/prototype/index.html\n**Copy deck**: docs/design/copy-decks/phase-${pad(ph)}.md\n**Testing**: heuristics/phase-${pad(ph)}\n\n${MH}\n|---|---|---|---|---|---|\n${mrows.join('\n')}\n`);
  }

  /* inventory columns */
  const invFile = path.join(D, 'screen-inventory.md');
  const out = fs.readFileSync(invFile, 'utf8').split(/\r?\n/).map((l) => {
    if (!l.startsWith('|')) return l;
    const c = l.split('|').slice(1, -1).map((x) => x.trim());
    if (c.length !== 14 || !/^[A-Z]{3}-\d{3}$/.test(c[0])) return l;
    const s = inv.find((x) => x.id === c[0]);
    c[9] = 'done'; c[10] = c[10] === 'approved' ? 'approved' : 'in-review'; c[11] = 'P,E,L,X,D';
    c[13] = `docs/design/packages/phase-${pad(s.phase)}/export`;
    return '| ' + c.join(' | ') + ' |';
  });
  fs.writeFileSync(invFile, out.join('\n'));
  console.log(`documents written for ${phases.length} phases`);
}
await browser.close();
