// Build twice into temporary folders and require byte-identical output (Article X, contract rule 6).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkg = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfe-tokens-'));
const dirs = ['a', 'b'].map((n) => path.join(tmp, n));
for (const d of dirs) execFileSync(process.execPath, [path.join(pkg, 'sd.build.mjs'), '--out', d], { stdio: 'pipe' });

const list = (d, rel = '') =>
  fs.readdirSync(path.join(d, rel), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? list(d, path.join(rel, e.name)) : [path.join(rel, e.name)]).sort();
const [fa, fb] = dirs.map((d) => list(d));
let ok = JSON.stringify(fa) === JSON.stringify(fb) && fa.length >= 3;
for (const f of fa) ok = ok && fs.readFileSync(path.join(dirs[0], f)).equals(fs.readFileSync(path.join(dirs[1], f)));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(ok ? `PASS deterministic build (${fa.length} files)` : 'FAIL builds differ');
process.exit(ok ? 0 : 1);
