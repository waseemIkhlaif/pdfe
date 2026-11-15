// Opens the prototype in the system Chrome through playwright-core (no browser download).
import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const indexUrl = pathToFileURL(path.join(root, 'docs', 'design', 'prototype', 'index.html')).href;

export async function launch() {
  const opts = { headless: true };
  if (process.env.PDFE_CHROME) opts.executablePath = process.env.PDFE_CHROME;
  else opts.channel = 'chrome';
  return chromium.launch(opts);
}

export const SIZES = { m360: [360, 800], m390: [390, 844], t768: [768, 1024], w1280: [1280, 800], w1440: [1440, 900] };

export function url(id, o = {}) {
  const q = new URLSearchParams({ lang: o.lang || 'en', state: o.state || 'populated', mode: o.mode || 'hifi', size: o.size || 'w1280', cap: '1' });
  return `${indexUrl}#${id}?${q}`;
}
