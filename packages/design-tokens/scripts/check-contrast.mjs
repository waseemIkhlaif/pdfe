// Dependency-free contrast and reserved-accent checker (research R-4, contracts/token-pipeline.md).
// Usage: node scripts/check-contrast.mjs        Exit 0 when every declared pair passes, 1 otherwise.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REQUIRED = { text: 4.5, 'large-text': 3.0, ui: 3.0 };

function parseHex(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`not a hex color: ${hex}`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Flatten a DTCG tree into Map<path, {value, reserved}>, resolving {a.b} aliases. */
export function flattenTokens(tree) {
  const raw = new Map();
  const walk = (node, trail, reserved) => {
    if (node === null || typeof node !== 'object') return;
    const here = node.$extensions?.pdfe?.reserved ?? reserved;
    if ('$value' in node) {
      raw.set(trail.join('.'), { value: node.$value, reserved: here });
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...trail, k], here);
  };
  walk(tree, [], undefined);

  const out = new Map();
  const resolve = (p, seen = new Set()) => {
    const t = raw.get(p);
    if (!t) return undefined;
    const m = typeof t.value === 'string' && t.value.match(/^\{(.+)\}$/);
    if (!m) return t;
    if (seen.has(p)) throw new Error(`alias cycle at ${p}`);
    seen.add(p);
    const target = resolve(m[1], seen);
    if (!target) throw new Error(`alias ${p} points to missing token ${m[1]}`);
    return { value: target.value, reserved: t.reserved ?? target.reserved };
  };
  for (const p of raw.keys()) out.set(p, resolve(p));
  return out;
}

export function evaluatePairs(tokens, pairs) {
  const failures = [];
  const passes = [];
  for (const [p, t] of tokens) {
    if (p.startsWith('color.simulation.') && t.reserved !== 'simulation-only') {
      failures.push(`FAIL ${p} is under color.simulation but not marked reserved (simulation-only)`);
    }
  }
  for (const pair of pairs) {
    const fg = tokens.get(pair.fg);
    const bg = tokens.get(pair.bg);
    if (!fg || !bg) {
      failures.push(`FAIL ${pair.id} missing token: ${!fg ? pair.fg : pair.bg}`);
      continue;
    }
    if (pair.group !== 'simulation' && (fg.reserved === 'simulation-only' || bg.reserved === 'simulation-only')) {
      failures.push(`FAIL ${pair.id} uses a reserved simulation token outside the simulation group`);
      continue;
    }
    const need = REQUIRED[pair.usage];
    if (need === undefined) {
      failures.push(`FAIL ${pair.id} has unknown usage "${pair.usage}"`);
      continue;
    }
    const ratio = contrastRatio(fg.value, bg.value);
    if (ratio < need) failures.push(`FAIL ${pair.id} ${ratio.toFixed(2)} < ${need}`);
    else passes.push(`PASS ${pair.id} ${ratio.toFixed(2)}`);
  }
  return { failures, passes };
}

function main() {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tokens');
  if (!fs.existsSync(dir)) {
    console.log('ERROR tokens directory not found: ' + dir);
    process.exit(1);
  }
  const merged = {};
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'pairs.json').sort()) {
    Object.assign(merged, JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }
  const pairsFile = path.join(dir, 'pairs.json');
  const pairs = fs.existsSync(pairsFile) ? JSON.parse(fs.readFileSync(pairsFile, 'utf8')) : [];
  let result;
  try {
    result = evaluatePairs(flattenTokens(merged), pairs);
  } catch (e) {
    console.log('ERROR ' + e.message);
    process.exit(1);
  }
  for (const l of result.passes) console.log(l);
  for (const l of result.failures) console.log(l);
  console.error(`${result.passes.length} passed, ${result.failures.length} failed`);
  process.exit(result.failures.length === 0 ? 0 : 1);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) main();
