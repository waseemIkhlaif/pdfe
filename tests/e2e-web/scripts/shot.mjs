// Takes a screenshot of one URL at a design size, for comparing a page with its baseline by eye:
//   node scripts/shot.mjs <url> <out.png> <width> <height>
import { chromium } from '@playwright/test';

const [url, out, w, h] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.screenshot({ path: out });
await browser.close();
console.log(`saved ${out}`);
