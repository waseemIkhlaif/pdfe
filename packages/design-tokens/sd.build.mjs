// Build the token outputs. Usage: node sd.build.mjs [--out <dir>]   (default: dist)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StyleDictionary, makeConfig } from './sd.config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const i = process.argv.indexOf('--out');
const out = i > -1 ? path.resolve(process.argv[i + 1]) : path.join(here, 'dist');

const sd = new StyleDictionary(makeConfig(out));
await sd.buildAllPlatforms();
console.log(`tokens built into ${out}`);
