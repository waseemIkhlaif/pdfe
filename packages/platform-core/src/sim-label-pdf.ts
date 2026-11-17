import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts, TextRenderingMode, rgb, setTextRenderingMode } from 'pdf-lib';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { SIM_LABEL_AR, SIM_LABEL_EN } from './sim-label';

/**
 * Stamps the simulation label on every page of a PDF (FR-022). Node only (it reads a font from disk).
 *
 * Each page gets an amber band along the top edge with the English line and the Arabic line. The Arabic is drawn with
 * Noto Naskh Arabic (SIL OFL 1.1), shaped, so it joins correctly. Shaped glyphs do not carry their original letters for text
 * extraction, so the same text is also written once more in invisible nominal glyphs: a reader sees the shaped line,
 * and search, copy and screen readers get the exact characters. The font has no em dash, so the dash is Helvetica.
 */
const ARABIC_FONT = '@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff';
const NO_SHAPING = {
  ccmp: false,
  locl: false,
  isol: false,
  init: false,
  medi: false,
  fina: false,
  rlig: false,
  liga: false,
  calt: false,
  mark: false,
  mkmk: false,
  curs: false,
  kern: false,
  dlig: false,
} as const;

const BAND = {
  bg: rgb(0.992, 0.902, 0.541),
  border: rgb(0.706, 0.325, 0.035),
  fg: rgb(0.271, 0.102, 0.012),
};
const EN_SIZE = 10;
const AR_SIZE = 12;
const BAND_HEIGHT = 34;

interface Fonts {
  latin: PDFFont;
  arabic: PDFFont;
  arabicNominal: PDFFont;
}

export async function pdfWithWatermark(pdf: Uint8Array): Promise<Uint8Array> {
  const fontkit = (await import('@pdf-lib/fontkit')).default;
  const doc = await PDFDocument.load(pdf);
  doc.registerFontkit(fontkit);
  const fontBytes = readFileSync(require.resolve(ARABIC_FONT));
  const fonts: Fonts = {
    latin: await doc.embedFont(StandardFonts.HelveticaBold),
    arabic: await doc.embedFont(fontBytes, { subset: true }),
    arabicNominal: await doc.embedFont(fontBytes, { subset: true, features: NO_SHAPING }),
  };
  for (const page of doc.getPages()) stampPage(page, fonts);
  doc.setSubject(`${SIM_LABEL_EN} / ${SIM_LABEL_AR}`);
  return doc.save();
}

function stampPage(page: PDFPage, f: Fonts): void {
  const { width, height } = page.getSize();
  const top = height - BAND_HEIGHT;
  page.drawRectangle({ x: 0, y: top, width, height: BAND_HEIGHT, color: BAND.bg });
  page.drawRectangle({ x: 0, y: top, width, height: 2, color: BAND.border });

  // English line, centred.
  const enW = f.latin.widthOfTextAtSize(SIM_LABEL_EN, EN_SIZE);
  page.drawText(SIM_LABEL_EN, {
    x: (width - enW) / 2,
    y: top + 21,
    size: EN_SIZE,
    font: f.latin,
    color: BAND.fg,
  });

  // Arabic line, centred and laid out right to left: first part, dash, second part. The dash is Helvetica.
  const [first, second] = SIM_LABEL_AR.split(' — ') as [string, string];
  const dash = '—';
  const gap = AR_SIZE * 0.5;
  const w1 = f.arabic.widthOfTextAtSize(first, AR_SIZE);
  const w2 = f.arabic.widthOfTextAtSize(second, AR_SIZE);
  const wd = f.latin.widthOfTextAtSize(dash, AR_SIZE);
  const total = w1 + gap + wd + gap + w2;
  const left = (width - total) / 2;
  const y = top + 7;
  // Right to left: `first` is rightmost.
  page.drawText(second, { x: left, y, size: AR_SIZE, font: f.arabic, color: BAND.fg });
  page.drawText(dash, { x: left + w2 + gap, y, size: AR_SIZE, font: f.latin, color: BAND.fg });
  page.drawText(first, {
    x: left + w2 + gap + wd + gap,
    y,
    size: AR_SIZE,
    font: f.arabic,
    color: BAND.fg,
  });

  // The same Arabic text again, invisible, in nominal glyphs, so extraction returns the exact characters.
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Invisible));
  page.drawText(`${first} `, { x: left, y, size: AR_SIZE, font: f.arabicNominal });
  page.drawText(dash, { x: left, y, size: AR_SIZE, font: f.latin });
  page.drawText(` ${second}`, { x: left, y, size: AR_SIZE, font: f.arabicNominal });
  page.pushOperators(setTextRenderingMode(TextRenderingMode.Fill));
}
