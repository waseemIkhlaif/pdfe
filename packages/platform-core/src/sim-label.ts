/** Single source of the simulation label text (constitution Article VIII, FR-022). Never inline these strings elsewhere. */
export const SIM_LABEL_EN = 'SIMULATION — NOT REAL MONEY';
export const SIM_LABEL_AR = 'محاكاة — ليست أموالاً حقيقية';
export const SIM_LABEL = `${SIM_LABEL_EN} / ${SIM_LABEL_AR}`;

// ---------------------------------------------------------------------------------------------------------------
// Labelled files and messages (FR-022). Every file the platform produces and every message it sends carries the label.
// These helpers are pure, so web and mobile code may import this module. The PDF watermark needs Node and lives in
// `sim-label-pdf.ts` (`@pdfe/platform-core/sim-label-pdf`).
// ---------------------------------------------------------------------------------------------------------------

/** The first line of a labelled CSV: a comment, so spreadsheet tools and parsers skip it. */
export const CSV_LABEL_LINE = `# ${SIM_LABEL}\n`;

/** A CSV document with the label as its first line. */
export function csvWithLabel(csv: string): string {
  return CSV_LABEL_LINE + csv;
}

/**
 * A JSON document with `meta.label` first. Extra `meta` fields are kept, but they can never replace the label.
 * `{ meta: { label, ...meta }, ...body }`; a `meta` key in the body is ignored in favour of the argument.
 */
export function jsonWithLabel<T extends Record<string, unknown>>(
  body: T,
  meta: Record<string, unknown> = {},
): { meta: { label: string } & Record<string, unknown> } & Omit<T, 'meta'> {
  const { meta: _ignored, ...rest } = body as Record<string, unknown>;
  void _ignored;
  return { meta: { ...meta, label: SIM_LABEL }, ...rest } as never;
}

export interface Notification {
  subject: string;
  body: string;
}

/** A notification whose subject and body both start with the label. */
export function notificationWithLabel(n: Notification): Notification {
  return { subject: `[${SIM_LABEL}] ${n.subject}`, body: `${SIM_LABEL}\n\n${n.body}` };
}
