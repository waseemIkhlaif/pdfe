import type { ReactNode } from 'react';
import { Icon } from './Icon';

export interface Column {
  key: string;
  label: string;
}

/**
 * A data table. On a narrow frame the container query of the stylesheet turns each row into a labelled block (`data-label`),
 * so nothing scrolls sideways on a phone. Cells are nodes: a link, a chip, a `<bdi>` amount.
 */
export function Table({
  columns,
  rows,
  caption,
}: {
  columns: Column[];
  rows: Record<string, ReactNode>[];
  caption: string;
}) {
  return (
    <div className="table-wrap" role="region" aria-label={caption} tabIndex={0}>
      <table>
        <caption className="sr-only" style={srOnly}>
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c.key} data-label={c.label}>
                  {row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Showing 1–4 of 4" with previous and next, as links (a link works without scripts and has a URL to share). */
export function Pager({
  summary,
  previous,
  next,
}: {
  summary: string;
  previous?: { label: string; href: string };
  next?: { label: string; href: string };
}) {
  return (
    <div className="pager">
      <span>{summary}</span>
      <span className="actions">
        {previous ? (
          <a className="btn" href={previous.href} aria-label={previous.label}>
            <Icon name="chevron-left" className="dir-icon" />
          </a>
        ) : (
          <span className="btn" aria-disabled="true" style={{ opacity: 0.55 }} />
        )}
        {next ? (
          <a className="btn" href={next.href} aria-label={next.label}>
            <Icon name="chevron" className="dir-icon" />
          </a>
        ) : (
          <span className="btn" aria-disabled="true" style={{ opacity: 0.55 }} />
        )}
      </span>
    </div>
  );
}

const srOnly = {
  position: 'absolute',
  inlineSize: 1,
  blockSize: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
