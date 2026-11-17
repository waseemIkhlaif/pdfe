import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  CSV_LABEL_LINE,
  SIM_LABEL,
  SIM_LABEL_AR,
  SIM_LABEL_EN,
  csvWithLabel,
  jsonWithLabel,
  notificationWithLabel,
} from '../src/sim-label';
import { pdfWithWatermark } from '../src/sim-label-pdf';

describe('csvWithLabel', () => {
  it('puts "# " and the label on line 1, then the original content untouched', () => {
    const out = csvWithLabel('a,b\n1,2\n');
    expect(out.split('\n')[0]).toBe(`# ${SIM_LABEL}`);
    expect(out).toBe(`# ${SIM_LABEL}\na,b\n1,2\n`);
    expect(CSV_LABEL_LINE).toBe(`# ${SIM_LABEL}\n`);
  });

  it('keeps a header row second, so a parser that skips comment lines sees the data as before', () => {
    const lines = csvWithLabel('id,name\n1,x').split('\n');
    expect(lines.slice(1)).toEqual(['id,name', '1,x']);
  });
});

describe('jsonWithLabel', () => {
  it('puts meta.label first, and keeps the body', () => {
    const out = jsonWithLabel({ events: [1, 2] });
    expect(out.meta.label).toBe(SIM_LABEL);
    expect(out.events).toEqual([1, 2]);
    expect(Object.keys(out)[0]).toBe('meta');
  });

  it('keeps extra meta fields but never lets anything replace the label', () => {
    const out = jsonWithLabel({ events: [] }, { count: 0, label: 'something else' });
    expect(out.meta).toEqual({ count: 0, label: SIM_LABEL });
    const sneaky = jsonWithLabel({ meta: { label: 'x' }, rows: [] } as Record<string, unknown>);
    expect(sneaky.meta.label).toBe(SIM_LABEL);
  });
});

describe('notificationWithLabel', () => {
  it('prefixes the subject and the body', () => {
    const n = notificationWithLabel({ subject: 'Approval requested', body: 'Please review.' });
    expect(n.subject.startsWith(`[${SIM_LABEL}]`)).toBe(true);
    expect(n.subject).toContain('Approval requested');
    expect(n.body.startsWith(SIM_LABEL)).toBe(true);
    expect(n.body.endsWith('Please review.')).toBe(true);
  });
});

/** The text of every page, as a PDF reader's text extraction returns it. */
async function pageTexts(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const out: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    out.push(tc.items.map((i) => ('str' in i ? i.str : '')).join(''));
  }
  return out;
}
/** Extraction puts stray spaces around joined letters and marks; the characters are what matter. */
const noSpace = (s: string) => s.replace(/\s+/g, '');

async function sourcePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([400, 300]);
    p.drawText(`Statement page ${i}`, { x: 20, y: 200, size: 14, font });
  }
  return doc.save();
}

describe('pdfWithWatermark', () => {
  it('puts both label strings in the extracted text of every page, and keeps the original text', async () => {
    const out = await pdfWithWatermark(await sourcePdf(3));
    const texts = await pageTexts(out);
    expect(texts).toHaveLength(3);
    texts.forEach((t, i) => {
      expect(noSpace(t), `page ${i + 1} English`).toContain(noSpace(SIM_LABEL_EN));
      expect(noSpace(t), `page ${i + 1} Arabic`).toContain(noSpace(SIM_LABEL_AR));
      expect(t, `page ${i + 1} original`).toContain(`Statement page ${i + 1}`);
    });
  });

  it('keeps the page count and sizes', async () => {
    const out = await PDFDocument.load(await pdfWithWatermark(await sourcePdf(2)));
    expect(out.getPageCount()).toBe(2);
    expect(out.getPage(0).getSize()).toEqual({ width: 400, height: 300 });
  });

  it('is deterministic apart from the PDF creation metadata it does not change', async () => {
    const src = await sourcePdf(1);
    const a = await pageTexts(await pdfWithWatermark(src));
    const b = await pageTexts(await pdfWithWatermark(src));
    expect(a).toEqual(b);
  });

  it('refuses something that is not a PDF', async () => {
    await expect(pdfWithWatermark(new TextEncoder().encode('not a pdf'))).rejects.toThrow();
  });
});
