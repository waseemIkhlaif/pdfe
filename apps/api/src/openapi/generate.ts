import 'reflect-metadata';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildOpenApiDocument } from './document';

/**
 * Writes packages/contracts/openapi.json. Run with `pnpm --filter @pdfe/api openapi` (after a build).
 * CI regenerates it and fails if the committed file differs: the document is the contract, and it follows the routes.
 */
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as {
  version: string;
};
const out = resolve(
  process.env.OPENAPI_OUT ?? resolve(__dirname, '../../../../packages/contracts/openapi.json'),
);
writeFileSync(out, `${JSON.stringify(buildOpenApiDocument(pkg.version), null, 2)}\n`);
console.log(`wrote ${out}`);
