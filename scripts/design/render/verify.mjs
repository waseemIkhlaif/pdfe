// Verifies the design prototype: every inventory screen has a definition and renders in both languages
// and all five states, with the exact simulation banner, correct direction, and no broken links or data.
// Exit 0 when everything passes. Needs the system Chrome (see browser.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { launch, indexUrl, root } from './browser.mjs';

const problems = [];
const bad = (m) => { if (problems.length < 60) problems.push(m); else if (problems.length === 60) problems.push('... more problems not shown'); };

// 1. CSS uses logical properties only
const css = fs.readFileSync(path.join(root, 'docs', 'design', 'prototype', 'app.css'), 'utf8');
for (const m of css.matchAll(/(margin|padding|border)-(left|right)\b|(^|[;{\s])(left|right)\s*:|float\s*:\s*(left|right)/g)) bad(`app.css uses a physical property: ${m[0].trim()}`);

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(indexUrl);
await page.waitForFunction(() => window.__ready === true);

const result = await page.evaluate(() => {
  const P = window.PDFE, out = { problems: [], frames: 0 };
  const SIM = ['SIMULATION — NOT REAL MONEY', 'محاكاة — ليست أموالاً حقيقية'];
  const inv = P.inventory, keys = new Set(inv.map((s) => s.ifc + '|' + s.name));
  for (const k of Object.keys(P.screens)) if (!keys.has(k)) out.problems.push('definition without an inventory screen: ' + k);
  for (const s of inv) {
    const d = P.screens[s.ifc + '|' + s.name];
    if (!d || !d.blocks || !d.blocks.length) { out.problems.push('no definition: ' + s.id + ' ' + s.name); continue; }
    if (!d.ar) out.problems.push('no Arabic title: ' + s.id);
    for (const b of d.blocks) if (b.k === 'table' && !P.ds[b.ds]) out.problems.push(s.id + ': unknown dataset ' + b.ds);
    for (const lang of ['en', 'ar']) for (const state of ['populated', 'empty', 'loading', 'error', 'denied']) {
      let html;
      try { html = P.renderFrame(s.id, { lang, state, mode: 'hifi', size: s.ifc === 'CON' ? 'm390' : 'w1280', cap: true }); }
      catch (e) { out.problems.push(`${s.id} ${lang} ${state}: render failed: ${e.message}`); continue; }
      out.frames++;
      const tag = `${s.id} ${lang} ${state}`;
      if (!html.includes('data-sim="1"') || !html.includes(SIM[lang === 'ar' ? 1 : 0])) out.problems.push(`${tag}: simulation banner missing or wrong`);
      if (!html.includes(`lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"`)) out.problems.push(`${tag}: wrong lang or dir`);
      if (!html.includes('<h1>')) out.problems.push(`${tag}: no page title`);
      if (/undefined|NaN|\[object/.test(html)) out.problems.push(`${tag}: broken value in output`);
      if (state === 'loading' && !html.includes('aria-busy')) out.problems.push(`${tag}: loading state missing`);
      if (state === 'error' && !(html.includes('COR-') && html.includes('btn primary'))) out.problems.push(`${tag}: error state needs a correlation ID and a retry`);
      if (state === 'denied' && !html.includes('state-box den')) out.problems.push(`${tag}: permission-denied state missing`);
      if (state === 'empty' && !(html.includes('state-box') || html.includes('class="form'))) out.problems.push(`${tag}: empty state missing`);
      if (state === 'populated' && s.money === 'yes' && !/class="steps"/.test(html) && !d.nosteps) out.problems.push(`${tag}: money screen has no Enter/Review/Result steps`);
      if (lang === 'ar' && !/[؀-ۿ]/.test(html.split('<main')[1] || '')) out.problems.push(`${tag}: no Arabic text on an Arabic screen`);
    }
  }
  out.unresolved = Array.from(new Set(window.__unresolved || []));
  out.screens = inv.length;
  return out;
});
for (const p of result.problems) bad(p);
for (const u of result.unresolved) bad('link target not in the inventory: ' + u);
for (const e of errors) bad('page error: ' + e);
await browser.close();

if (problems.length) {
  console.log('FAIL design prototype');
  for (const p of problems) console.log('  ' + p);
  process.exit(1);
}
console.log(`PASS design prototype: ${result.screens} screens, ${result.frames} frames (2 languages x 5 states)`);
